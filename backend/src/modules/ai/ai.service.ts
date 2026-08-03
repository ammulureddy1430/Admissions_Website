import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VertexRagService } from './vertex-rag.service';

@Injectable()
export class AIService {
  private feedbackVariantCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vertexRagService: VertexRagService,
  ) {}

  async generateGroundedAssessment(
    dto: {
      grade: string;
      subject: string;
      difficulty: string;
      questionCount: number;
      writtenQuestionCount?: number;
      chapter?: string;
      questionTypes?: string[];
    },
    schoolId: string,
  ) {
    return this.vertexRagService.generateAssessment(schoolId, dto);
  }

  async assessmentAssistant(
    dto: {
      assessmentId: string;
      submissionId?: string;
      questionId: string;
      questionNumber: number;
      message: string;
      action?: 'EXPLAIN' | 'HINT' | 'EXAMPLE';
      history?: Array<{ role: string; content: string }>;
    },
    schoolId: string,
    userId: string,
  ) {
    const settings = await this.prisma.schoolSettings.findUnique({ where: { schoolId } });
    if (!settings?.assessmentAiEnabled) {
      throw new ForbiddenException('The AI Learning Assistant is disabled by your school.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) throw new ForbiddenException('Assessment access denied.');

    const applicationOwnership =
      user.role === 'STUDENT'
        ? {
            OR: [
              { studentEmail: user.email },
              {
                studentFirstName: user.firstName,
                studentLastName: user.lastName,
              },
            ],
          }
        : { parentId: userId };

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: dto.assessmentId,
        schoolId,
        application: applicationOwnership,
      },
      include: { questions: true },
    });
    if (!assessment) throw new ForbiddenException('Assessment access denied.');
    const question = assessment.questions.find(item => item.id === dto.questionId);
    if (!question) throw new BadRequestException('Current question was not found.');

    const message = String(dto.message || '').trim().slice(0, 1000);
    if (!message) throw new BadRequestException('Message is required.');
    const asksForAnswer = /\b(correct answer|exact answer|give me the answer|which (option|choice)|choose (a|b|c|d)|solve (this|the) (question|problem)|answer this)\b/i.test(message);
    const mode = settings.assessmentAiMode || 'BOTH';
    const action = ['EXPLAIN', 'HINT', 'EXAMPLE'].includes(dto.action || '')
      ? dto.action
      : undefined;
    const asksForHint = action === 'HINT' || /\b(hint|clue|nudge|method|approach)\b/i.test(message);
    const blockedByMode =
      (mode === 'CONCEPTS_ONLY' && asksForHint) ||
      (mode === 'HINTS_ONLY' && !asksForHint);
    const refusal = "I can't provide answers to active assessment questions. I can explain the concept or help you understand how to solve similar problems.";

    let reply: string;
    let blocked = asksForAnswer;
    if (asksForAnswer) {
      reply = refusal;
    } else if (blockedByMode) {
      reply = mode === 'CONCEPTS_ONLY'
        ? 'This assistant is configured for concept explanations only. Ask me about a definition, formula, grammar rule, or related concept.'
        : 'This assistant is configured for hints only. Ask for a small clue or a problem-solving approach.';
    } else {
      const gradeGuidance = this.gradeGuidance(assessment.grade);
      const detectedConcept = this.detectAssessmentConcept(assessment.subject, question.questionText);
      const actionInstruction =
        action === 'EXPLAIN'
          ? 'Explain the underlying concept clearly without solving the active question.'
          : action === 'HINT'
            ? 'Give one small, progressive hint only. Do not reveal the answer.'
            : action === 'EXAMPLE'
              ? 'Generate a fresh, fully worked similar example using different details from the active question.'
              : 'Respond to the student request with safe conceptual guidance.';
      const recentHistory = (dto.history || [])
        .slice(-8)
        .map(item => `${item.role === 'assistant' ? 'Assistant' : 'Student'}: ${String(item.content).slice(0, 600)}`)
        .join('\n');
      const policyPrompt = `You are an AI Learning Assistant inside an ACTIVE school assessment.
Never reveal, reproduce, infer, or confirm the correct answer or a correct option. Never solve the active question.
Give only a short educational explanation or a progressive hint, using a different example when useful.
When the student asks for a similar example, provide one concrete, fully worked example with:
1. a clearly labeled Example question,
2. the clue or method,
3. the example's answer,
4. one sentence explaining how to reuse the method on the active question.
The example must use different names, numbers, objects, or facts and must never reveal the active question's answer.
If asked for the answer, reply exactly: "${refusal}"
Context: Grade ${assessment.grade}; Subject ${assessment.subject}; Assessment ${assessment.title}; Question ${dto.questionNumber}.
Active question (use only to identify the concept, never answer it): ${question.questionText}
Detected concept: ${detectedConcept}. Keep every explanation, hint, and example strictly within this concept.
Teaching level requirement: ${gradeGuidance}
Match vocabulary, sentence length, example complexity, and reasoning depth to this exact class level.
Requested live action: ${actionInstruction}
Recent conversation:
${recentHistory || 'No previous conversation.'}
School mode: ${mode}. Student request: ${message}`;
      try {
        reply = (await this.chat(policyPrompt, schoolId)).response;
      } catch {
        reply = this.localAssessmentGuidance(
          assessment.grade,
          assessment.subject,
          question.questionText,
          asksForHint,
          message,
        );
      }
      const correctAnswer = question.correctAnswer?.trim();
      const escapedAnswer = correctAnswer?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const revealsCorrectAnswer = escapedAnswer
        ? new RegExp(`(^|\\W)${escapedAnswer}(?=\\W|$)`, 'i').test(reply)
        : false;
      if (revealsCorrectAnswer) {
        reply = refusal;
        blocked = true;
      }
    }

    if (settings.assessmentAiLogChats) {
      await this.prisma.assessmentAssistantChatLog.create({
        data: {
          schoolId,
          userId,
          assessmentId: assessment.id,
          submissionId: dto.submissionId || null,
          subject: assessment.subject,
          grade: assessment.grade,
          questionNumber: dto.questionNumber,
          studentMessage: message,
          assistantReply: reply,
          blocked,
        },
      });
    }
    return { response: reply, blocked, mode };
  }

  private gradeGuidance(grade: string) {
    if (/^(Nursery|LKG|UKG)$/i.test(grade)) {
      return 'Use very short, friendly sentences, familiar objects, spoken-sound cues, counting, colours, shapes, and one simple step at a time.';
    }
    const number = Number(grade.match(/\d+/)?.[0] || 0);
    if (number <= 2) return 'Use simple words, short sentences, concrete everyday examples, and no more than two reasoning steps.';
    if (number <= 5) return 'Use clear primary-school vocabulary, a familiar example, and a short step-by-step strategy.';
    if (number <= 8) return 'Use age-appropriate academic vocabulary, explain the underlying rule, and guide multi-step reasoning without completing it.';
    return 'Use secondary-school terminology, conceptual reasoning, formulas where relevant, and strategic hints without performing the final solution.';
  }

  private detectAssessmentConcept(subject: string, questionText: string) {
    const question = questionText.toLowerCase();
    const isMath = subject.toLowerCase().includes('math') || subject.toLowerCase() === 'all';
    if (isMath) {
      if (/\b(multiply|multiplied|multiplication|product|times table|groups? of|equal groups?|repeated addition|array|rows? of|columns? of)\b|[×*]/i.test(question)) return 'MULTIPLICATION';
      if (/\b(divide|divided|division|quotient|shared equally|split equally|equal shares?)\b|÷/i.test(question)) return 'DIVISION';
      if (/\b(add|added|addition|sum|altogether|in all|combined)\b|\+/i.test(question)) return 'ADDITION';
      if (/\b(subtract|subtracted|subtraction|difference|take away|how many left|remain)\b|[−-]/i.test(question)) return 'SUBTRACTION';
      if (/\b(percent|percentage)\b|%/i.test(question)) return 'PERCENTAGE';
      if (/\b(fraction|numerator|denominator)\b/i.test(question)) return 'FRACTIONS';
      if (/\bperimeter\b/i.test(question)) return 'PERIMETER';
      if (/\barea\b/i.test(question)) return 'AREA';
      if (/\bpattern|sequence\b/i.test(question)) return 'NUMBER PATTERN';
    }
    return `${subject} concept described by the active question`;
  }

  private localAssessmentGuidance(grade: string, subject: string, questionText: string, hint: boolean, studentMessage: string) {
    const earlyYears = /^(Nursery|LKG|UKG)$/i.test(grade);
    const gradeNumber = Number(grade.match(/\d+/)?.[0] || 0);
    const primary = earlyYears || gradeNumber <= 5;
    const question = questionText.toLowerCase();
    const wantsFormula = /\bformula\b/i.test(studentMessage);
    const wantsMeaning = /\bwhat does|word mean|meaning|definition\b/i.test(studentMessage);
    const wantsSimilarExample = /\bsimilar example|another example\b/i.test(studentMessage);
    let lowerSubject = subject.toLowerCase();
    if (lowerSubject === 'all') {
      if (/\bnoun|verb|adjective|sentence|spell|punctuation|word|grammar\b/.test(question)) lowerSubject = 'english literature';
      else if (/[+*×÷%=]|\bmath|number|divide|division|multiply|multiplication|multiplied|product|times table|equal groups|groups of|repeated addition|fraction|area|perimeter|solve for x\b/.test(question)) lowerSubject = 'mathematics';
      else if (/\bplant|root|leaf|matter|solid|liquid|gas|force|energy|water cycle|pollution\b/.test(question)) lowerSubject = 'science & technology';
      else if (/\bgovernment|citizen|country|map|community|law|rules\b/.test(question)) lowerSubject = 'social studies';
    }

    if (lowerSubject.includes('english')) {
      const englishConcept =
        /\bnoun\b/.test(question) ? 'A noun is a naming word for a person, place, animal, or thing.' :
        /\bverb\b/.test(question) ? 'A verb tells what someone or something does, or describes a state.' :
        /\badjective\b/.test(question) ? 'An adjective is a describing word. It tells us more about a noun.' :
        /\bopposite|antonym\b/.test(question) ? 'Opposite words have meanings that are very different, such as “hot” and “cold”.' :
        /\bspell|spelled|spelling\b/.test(question) ? 'To check spelling, say the word slowly, listen for each sound, and notice familiar letter patterns.' :
        /\bpunctuation|question mark|full stop|comma\b/.test(question) ? 'Punctuation shows how a sentence should be read. A question, statement, and list use different marks.' :
        /\bcomplete the sentence|sentence\b/.test(question) ? 'Read the whole sentence and check which kind of word is missing and whether it agrees with the subject.' :
        'Use the words around the difficult part to decide its meaning or grammar job.';
      if (wantsMeaning) {
        return `${englishConcept} If you mean a different word in the question, type that word and I will explain it in ${grade}-appropriate language.`;
      }
      if (wantsSimilarExample) {
        const example =
          /\bnoun\b/.test(question) ? 'Example question: Find the noun in “The puppy plays.”\nMethod: Look for the naming word.\nExample answer: “puppy” is the noun.' :
          /\bverb\b/.test(question) ? 'Example question: Find the verb in “Birds fly.”\nMethod: Look for the action word.\nExample answer: “fly” is the verb.' :
          /\badjective\b/.test(question) ? 'Example question: Find the adjective in “a bright star.”\nMethod: Look for the word that describes the noun.\nExample answer: “bright” is the adjective.' :
          /\bpunctuation\b/.test(question) ? 'Example question: Which mark completes “Where are you__”?\nMethod: The sentence asks something.\nExample answer: Use a question mark.' :
          'Example question: Identify the jobs of the words in “The small cat runs.”\nMethod: Find the naming, describing, and action words.\nExample answer: “cat” names, “small” describes, and “runs” shows action.';
        return `${example}\nNow use the same method—not the example answer—on the active question.`;
      }
      if (earlyYears) {
        return hint
          ? `Small hint: ${englishConcept} Now say each choice slowly and use that rule.`
          : `${englishConcept} Try the same rule with a familiar word such as “ball”, “run”, or “red”, then return to the question.`;
      }
      return hint
        ? `Hint: ${englishConcept} Apply that rule to a different short sentence first, then check each choice.`
        : `${englishConcept} At ${grade} level, read the full sentence, identify each word’s job, and apply the same rule without guessing from one word alone.`;
    }
    if (lowerSubject.includes('math')) {
      const detectedMathConcept = this.detectAssessmentConcept(subject, questionText);
      const isMultiplication = detectedMathConcept === 'MULTIPLICATION';
      const isDivision = detectedMathConcept === 'DIVISION';
      const isAddition = detectedMathConcept === 'ADDITION';
      const isSubtraction = detectedMathConcept === 'SUBTRACTION';
      const mathConcept =
        isDivision ? 'Division means sharing into equal groups or finding how many equal groups can be made.' :
        isMultiplication ? 'Multiplication combines equal groups. A smaller related fact can help you recall a larger one.' :
        /\bpercent|%\b/.test(question) ? 'A percentage means a number out of 100. Connect it to a fraction or decimal before calculating.' :
        /\bfraction\b/.test(question) ? 'A fraction describes equal parts of a whole. Check the denominator for total equal parts and the numerator for selected parts.' :
        /\bperimeter\b/.test(question) ? 'Perimeter is the total distance around a shape, so every outside side length matters.' :
        /\barea\b/.test(question) ? 'Area measures the surface inside a shape and is written in square units.' :
        isAddition ? 'Addition combines quantities to find a total.' :
        isSubtraction ? 'Subtraction finds what remains or the difference between quantities.' :
        /\bpattern\b/.test(question) ? 'A pattern follows a repeating or changing rule. Compare each step to find what changes.' :
        'Identify the numbers, the relationship between them, and the operation or rule being tested.';
      if (wantsFormula) {
        const formula =
          /\bpercent|%\b/.test(question) ? 'Percentage of a quantity = (percentage ÷ 100) × quantity.' :
          /\bperimeter\b/.test(question) ? 'Perimeter = the sum of all outside side lengths.' :
          /\barea\b/.test(question) ? 'For a rectangle, area = length × width.' :
          isDivision ? 'Division can be checked using: divisor × quotient = dividend.' :
          isMultiplication ? 'Multiplication represents: number of equal groups × items in each group.' :
          /\bsolve for x\b/.test(question) ? 'For an equation, use inverse operations in reverse order to isolate x.' :
          'Choose the rule that matches the quantities and operation named in the question.';
        return `${formula} Try it first with easier numbers rather than the numbers in the active question.`;
      }
      if (wantsSimilarExample) {
        const example =
          isDivision ? 'Example question: What is 24 ÷ 6?\nMethod: Ask how many groups of 6 make 24, then check with multiplication.\nExample answer: 4, because 6 × 4 = 24.' :
          isMultiplication ? 'Example question: What is 4 × 3?\nMethod: Make four equal groups of three: 3 + 3 + 3 + 3.\nExample answer: 12.' :
          isAddition ? 'Example question: What is 6 + 3?\nMethod: Start at 6 and count forward 3 steps: 7, 8, 9.\nExample answer: 9.' :
          isSubtraction ? 'Example question: What is 9 − 4?\nMethod: Start at 9 and count back 4 steps: 8, 7, 6, 5.\nExample answer: 5.' :
          /\bpercent|%\b/.test(question) ? 'Example question: What is 10% of 50?\nMethod: Convert 10% to 10 ÷ 100, then multiply by 50.\nExample answer: 5.' :
          /\bfraction\b/.test(question) ? 'Example question: A pizza has 8 equal slices and 3 are eaten. What fraction was eaten?\nMethod: Put the selected parts over the total equal parts.\nExample answer: 3/8.' :
          /\bperimeter\b/.test(question) ? 'Example question: Find the perimeter of a rectangle with sides 3 cm and 2 cm.\nMethod: Add all four outside sides: 3 + 2 + 3 + 2.\nExample answer: 10 cm.' :
          /\barea\b/.test(question) ? 'Example question: Find the area of a rectangle that is 4 cm long and 2 cm wide.\nMethod: Multiply length by width.\nExample answer: 8 square centimetres.' :
          /\bpattern\b/.test(question) ? 'Example question: What comes next: 2, 4, 6, __?\nMethod: Notice that each number increases by 2.\nExample answer: 8.' :
          /\bsolve for x\b/.test(question) ? 'Example question: Solve 3x + 2 = 14.\nMethod: Subtract 2, then divide by 3.\nExample answer: x = 4.' :
          'Example question: Mia has 5 pencils and receives 2 more. How many pencils does she have?\nMethod: Combine the two quantities using addition.\nExample answer: 7 pencils.';
        return `${example}\nNow apply the method—not the example’s result—to the active question.`;
      }
      if (earlyYears) {
        return hint
          ? `Small hint: ${mathConcept} Use fingers or imagine a row of objects, then check once more.`
          : `${mathConcept} Try the same idea with three toys or blocks before returning to the question.`;
      }
      return hint
        ? `Hint: ${mathConcept} Write what is known and what must be found, then test the method with easier numbers.`
        : `${mathConcept} ${primary ? 'Use a small everyday example and work one step at a time.' : 'Connect the quantities to the relevant rule or formula.'} Check whether a result would be reasonable without calculating the active answer here.`;
    }
    if (lowerSubject.includes('science') || lowerSubject === 'evs') {
      const isPlanetQuestion = /\bplanet|earth|mars|venus|jupiter|saturn|solar system\b/.test(question);
      const scienceConcept =
        isPlanetQuestion ? 'Planets are large, round worlds that travel around a star. One planet has liquid oceans, breathable air, land, and all known human life.' :
        /\bplant|root|leaf|flower\b/.test(question) ? 'Plant parts have different jobs: taking in water, making food, supporting growth, or reproduction.' :
        /\bsolid|liquid|gas|matter\b/.test(question) ? 'States of matter differ in whether they keep a fixed shape or volume and how their particles move.' :
        /\bforce|motion|move\b/.test(question) ? 'A force is a push or pull that can change motion, direction, speed, or shape.' :
        /\bwater cycle|evaporation|condensation\b/.test(question) ? 'The water cycle moves water through evaporation, condensation, and precipitation.' :
        /\benergy|solar|renewable\b/.test(question) ? 'Energy sources can be renewable when nature replaces them, or non-renewable when supplies are limited.' :
        /\bpollution|waste|recycl|environment\b/.test(question) ? 'Environmental choices affect air, water, land, and living things through cause and effect.' :
        'Identify the scientific object or process, what it does, and what causes the observed effect.';
      if (wantsMeaning) return `${scienceConcept} Type the exact science word if you want its meaning explained more simply.`;
      if (wantsFormula) {
        return isPlanetQuestion
          ? 'No formula is needed. Compare each choice with these clues: oceans, air, land, and the home of people, animals, and plants.'
          : 'No formula is needed for this concept. Identify the object or process, then compare its observable features and cause-and-effect relationship.';
      }
      if (wantsSimilarExample) {
        return isPlanetQuestion
          ? 'Example question: Which star gives our world light and heat?\nMethod: Match the clue “the star at the centre of our solar system” to the choices.\nExample answer: The Sun.\nNow use the same clue-matching method on the active planet question.'
          : `Example question: Observe a different everyday example of the same process.\nMethod: Name the object, what changes, and what causes the change.\nExample explanation: connect the observation to this rule—${scienceConcept}\nNow apply that cause-and-effect method to the active question.`;
      }
      return hint
        ? isPlanetQuestion
          ? 'Hint: Look for the planet with oceans, continents, clouds, and the air that people breathe. Compare that description with each choice.'
          : `Hint: ${scienceConcept} Recall one familiar example and use it to test each choice.`
        : `${scienceConcept} ${primary ? 'Think about something you have seen at home, outdoors, or in class.' : 'Connect the observation to the scientific system behind it.'}`;
    }
    if (lowerSubject.includes('social')) {
      if (wantsMeaning) return 'Identify the unfamiliar civic, map, government, or community word and type it here; I will define it using a grade-appropriate example.';
      if (wantsFormula) return 'Social Studies questions usually use definitions, purposes, causes, and effects rather than mathematical formulas.';
      if (wantsSimilarExample) return 'Example question: Why does a school have a rule to walk in the hallway?\nMethod: Identify the rule, its purpose, and whom it protects.\nExample answer: It helps prevent collisions and keeps students safe.\nNow use the same purpose-and-effect method on the active question.';
      return hint
        ? 'Hint: identify the person, place, rule, map idea, or community role being described, then recall its main purpose.'
        : `Social Studies connects people, places, communities, rules, and events. ${primary ? 'Use a familiar example from your school or neighbourhood.' : 'Consider causes, responsibilities, perspectives, and consequences.'}`;
    }

    if (wantsFormula) return `This ${subject} question may not require a formula. First identify whether it tests a definition, relationship, process, or calculation.`;
    if (wantsMeaning) return `Type the exact word you want defined, and I will explain it using vocabulary suitable for ${grade}.`;
    if (wantsSimilarExample) {
      return `Example question: In ${subject}, how would you classify a new item using two facts you already know?\nMethod: Identify the topic, list its defining features, and compare them one at a time.\nExample answer: The item belongs to the group whose defining features both match.\nNow apply the same compare-and-classify method to the active question.`;
    }
    return hint
      ? `Hint for ${grade}: underline the key words, decide which concept is being tested, and try the method on a simpler but similar example.`
      : `${this.gradeGuidance(grade)} The question is about ${subject}; focus on the key idea and ask about a specific word or rule for a more precise explanation.`;
  }

  async assessmentChatLogs(schoolId: string, assessmentId?: string) {
    return this.prisma.assessmentAssistantChatLog.findMany({
      where: { schoolId, ...(assessmentId ? { assessmentId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async chat(message: string, schoolId: string) {
    const schoolSettings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    const context = schoolSettings?.aiContext || 'This is a premium school portal.';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.includes('dummy')) {
      // High-quality local mock fallback for development without OpenAI API key
      if (message.toLowerCase().includes('generate a reading') || message.toLowerCase().includes('generate reading')) {
        const gradeMatch = message.match(/grade ['"]?([^'"]+)['"]?/i) || message.match(/for (Grade \d+|Nursery|LKG|UKG)/i);
        const subjectMatch = message.match(/subject ['"]?([^'"]+)['"]?/i);
        const typeMatch = message.match(/Generate a Reading (\w+)/i) || message.match(/Generate Reading (\w+)/i);
        const grade = gradeMatch ? gradeMatch[1] : 'Grade 1';
        const subject = subjectMatch ? subjectMatch[1] : 'English';
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'passage';
        
        let title = 'The Great Adventure';
        let body = `Once upon a time in ${grade}, a young explorer set out to discover the secrets of ${subject}. With a magnifying glass and a backpack full of notebooks, they walked into the Whispering Woods. Suddenly, a little blue bird landed on a branch nearby. "Are you looking for the lost treasure?" the bird chirped. The explorer nodded excitedly, realizing this was going to be an unforgettable journey of learning.`;
        
        if (type === 'poem') {
          title = 'Whispers of the Wind';
          body = `The trees stand tall in green and gold,\nStories of the ancient woods untold.\nFor students in ${grade} who seek to know,\nHow the subject of ${subject} makes us grow.\nListen to the rivers as they run,\nUnderneath the bright and warm golden sun.`;
        } else if (type === 'story') {
          title = 'The Lost Library';
          body = `In the heart of the school, there was a forgotten door. A student from ${grade} pushed it open and found shelves filled with books about ${subject}. When they touched the oldest book, it began to glow softly. A friendly hologram of a librarian appeared. "Welcome," the librarian said. "You have unlocked the gate of knowledge. Let us read together."`;
        }
        
        return {
          response: `${title}\n\n${body}`,
          model: 'mock-gpt-development',
        };
      } else if (message.toLowerCase().includes('generate a speaking topic') || message.toLowerCase().includes('generate speaking topic')) {
        const gradeMatch = message.match(/grade ['"]?([^'"]+)['"]?/i) || message.match(/for (Grade \d+|Nursery|LKG|UKG)/i);
        const grade = gradeMatch ? gradeMatch[1] : 'Grade 1';
        const topicTypeMatch = message.match(/Topic Type ['"]?([^'"]+)['"]?/i) || message.match(/type ['"]?([^'"]+)['"]?/i);
        const topicType = topicTypeMatch ? topicTypeMatch[1] : 'Introduce Yourself';
        
        let response = `Introduce yourself to the admissions committee. Tell us your name, your age, what you like to do in your free time, and what you are looking forward to learning in your new class. (Suitable for ${grade} level)`;
        
        if (topicType.includes('Picture Description')) {
          response = `Look at the picture shown by the interviewer (or imagine a busy park). Describe what the people are doing, what objects you see, and what the weather feels like. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Story Telling')) {
          response = `Tell a short story about a time when you helped a friend or family member. Explain what the problem was, how you helped them, and how you felt afterwards. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Describe Your School')) {
          response = `Describe your previous school or classroom. What did you like most about it? Who was your favorite teacher and why? (Suitable for ${grade} level)`;
        } else if (topicType.includes('Favorite Animal')) {
          response = `Talk about your favorite animal. Describe what it looks like, where it lives, what it eats, and why you find it interesting. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Favorite Festival')) {
          response = `Describe your favorite festival or celebration. Talk about how you celebrate it with your family, what special foods you eat, and why it is special to you. (Suitable for ${grade} level)`;
        } else if (topicType.includes('My Family')) {
          response = `Talk about your family. Who is in your family? Describe a fun memory or activity that you recently did together. (Suitable for ${grade} level)`;
        } else if (topicType.includes('My Hobby')) {
          response = `Describe your favorite hobby and explain why it makes you happy. Talk about when you started it, what equipment or items you need, and how you feel when doing it. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Conversation Practice')) {
          response = `Simulate a conversation with a new friend on their first day of school. Ask them three friendly questions and invite them to play with you during recess. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Role Play')) {
          response = `Imagine you are a doctor and a patient comes to you with a cold. Give them three pieces of advice on how to get better quickly. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Explain a Situation')) {
          response = `Imagine you lost your favorite toy at a playground. Explain the situation to your parents, describing what the toy looks like and where you last saw it. (Suitable for ${grade} level)`;
        } else if (topicType.includes('Interview Questions')) {
          response = `Answer the following interview questions: Why do you want to join our school? What is your favorite subject and why? What is a challenge you overcame recently? (Suitable for ${grade} level)`;
        } else if (topicType.includes('Extempore Speech')) {
          response = `Give a short, spontaneous speech on the topic: "Why saving water is important for our planet". Suggest two simple ways we can save water every day. (Suitable for ${grade} level)`;
        }
        
        return {
          response,
          model: 'mock-gpt-development',
        };
      } else if (message.toLowerCase().includes('generate a short listening exercise') || message.toLowerCase().includes('generate listening exercise')) {
        const gradeMatch = message.match(/grade ['"]?([^'"]+)['"]?/i) || message.match(/for (Grade \d+|Nursery|LKG|UKG)/i);
        const subjectMatch = message.match(/subject ['"]?([^'"]+)['"]?/i);
        const grade = gradeMatch ? gradeMatch[1] : 'Grade 1';
        const subject = subjectMatch ? subjectMatch[1] : 'Science';
        
        return {
          response: `Welcome class. Today we will explore a fascinating topic in ${subject} designed for ${grade}. Did you know that when objects heat up, they expand? Think of a balloon left in the warm sunshine; it slowly grows larger as the air inside gets warmer and pushes outward. We will listen to a short conversation between two scientists talking about how temperature affects different states of matter. Listen closely to their arguments.`,
          model: 'mock-gpt-development',
        };
      } else if (message.includes('Generate detailed admission feedback')) {
        const scoreMatch = message.match(/score of (\d+)/);
        const score = scoreMatch ? Number(scoreMatch[1]) : 80;
        let variants: string[];
        if (score >= 90) {
          variants = [
            "The candidate demonstrated outstanding academic potential and exceptional communication skills. They answered analytical questions with clarity and structured logic, showing strong alignment with the school's values. Highly recommended for admission.",
            "An exceptional interview performance reflected excellent preparation, confident communication, and advanced reasoning ability. The candidate responded precisely and consistently exceeded expectations. Strongly recommended for admission.",
            "The candidate delivered a highly impressive assessment, combining thoughtful analysis with clear and confident expression. Their responses showed maturity, accuracy, and excellent academic readiness. Highly recommended.",
          ];
        } else if (score >= 80) {
          variants = [
            "The candidate showed strong performance, communicating their thoughts effectively and answering core questions accurately. They possess good analytical skills and meet the primary admission criteria. Recommended for admission.",
            "A confident and well-prepared performance demonstrated solid subject understanding and effective communication. The candidate handled the main questions accurately and displayed good analytical ability. Recommended for admission.",
            "The candidate performed very well and presented ideas in a clear, organized manner. Their answers reflected sound reasoning, good preparation, and readiness for the programme. Admission is recommended.",
          ];
        } else if (score >= 70) {
          variants = [
            "The candidate's performance was satisfactory. They met the basic expectations and demonstrated sufficient capability, though they could benefit from improvements in articulation. Suitable for admission.",
            "The interview reflected an adequate understanding of the core areas and a reasonable ability to communicate ideas. Greater confidence and more detailed responses would strengthen future performance. Suitable for consideration.",
            "The candidate met the essential assessment requirements and showed a developing grasp of the expected concepts. Some improvement in clarity and depth is advisable, but the overall performance was satisfactory.",
          ];
        } else {
          variants = [
            "The candidate's performance was below the required threshold. They struggled with communication and key problem-solving questions. Further review and preparation are recommended before standard entry.",
            "The assessment indicated gaps in core understanding and difficulty expressing responses clearly. The candidate would benefit from additional preparation before being reconsidered for admission.",
            "The candidate did not yet demonstrate the required level of subject knowledge or communication confidence. Focused improvement and a subsequent review are advised.",
          ];
        }
        const response = variants[this.feedbackVariantCounter++ % variants.length];
        return {
          response,
          model: 'mock-gpt-development',
        };
      } else if (message.includes('Proofread, fix any spelling or grammar errors')) {
        // Robust text extraction ignoring nested single quotes inside the feedback body
        const prefix = "admission feedback: '";
        const suffix = "' while preserving the core message.";
        const startIdx = message.indexOf(prefix);
        const endIdx = message.lastIndexOf(suffix);
        
        let rawText = '';
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          rawText = message.substring(startIdx + prefix.length, endIdx);
        } else {
          // Fallback to regex if prompt structure is different
          const textMatch = message.match(/'([^']+)'/) || message.match(/feedback:\s*"([^"]+)"/) || [null, ''];
          rawText = textMatch[1] || '';
        }
        
        rawText = rawText.replace(/^['"]|['"]$/g, '').trim();

        if (rawText.toLowerCase() === 'good') {
          return {
            response: 'The candidate demonstrated positive performance and met all primary expectations.',
            model: 'mock-gpt-development',
          };
        }
        
        // Basic common typo corrections
        let cleaned = rawText
          .replace(/\bgoodd+\b/gi, 'good')
          .replace(/\bstrongs+\b/gi, 'strong')
          .replace(/\bperform[a-z]*nce\b/gi, 'performance')
          .replace(/\bcomunic[a-z]*\b/gi, 'communication')
          .replace(/\bcommunicatng\b/gi, 'communicating')
          .replace(/\beffectivly\b/gi, 'effectively')
          .replace(/\baccuratly\b/gi, 'accurately')
          .replace(/\banalitical\b/gi, 'analytical')
          .replace(/\bcriterias\b/gi, 'criteria')
          .replace(/\brecomended\b/gi, 'recommended')
          .replace(/\bgud\b/gi, 'good')
          .replace(/\bsepllings\b/gi, 'spellings')
          .replace(/\bgrammer\b/gi, 'grammar')
          .replace(/\bstudnt\b/gi, 'student')
          .replace(/\brecieved\b/gi, 'received')
          .replace(/\bteh\b/gi, 'the')
          .replace(/\bu\b/gi, 'you')
          .replace(/\br\b/gi, 'are')
          .replace(/\bplz\b/gi, 'please')
          .replace(/\bhe are\b/gi, 'he is')
          .replace(/\bthey is\b/gi, 'they are')
          .replace(/\bshowed strong of performance\b/gi, 'showed strong performance')
          .replace(/\bdemonstrated strong of performance\b/gi, 'demonstrated strong performance')
          .replace(/\bshowed a strong of performance\b/gi, 'showed a strong performance');

        // Remove accidental repeated-letter fragments such as "ss" while
        // preserving valid short words (is, as, to, etc.).
        cleaned = cleaned.replace(/\b([a-z])\1+\b/gi, ' ').replace(/\s{2,}/g, ' ').trim();

        // Use a general spelling/grammar engine when OpenAI is not configured.
        // LANGUAGE_TOOL_URL may point to a private/self-hosted instance.
        try {
          cleaned = await this.proofreadWithLanguageTool(cleaned);
        } catch (error) {
          console.warn('General proofreading service unavailable; using local corrections:', error);
        }
        
        // Capitalize first letter
        if (cleaned.length > 0) {
          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          // Only append a period if the original input text was a sentence (contains spaces)
          if (rawText.trim().includes(' ')) {
            if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
              cleaned += '.';
            }
          }
        }

        return {
          response: cleaned || 'No input text provided.',
          model: 'mock-gpt-development',
        };
      } else if (message.toLowerCase().includes('logic puzzle') || message.toLowerCase().includes('logical thinking')) {
        const typeMatch = message.match(/type\s+['"]?([A-Z_]+)['"]?/i);
        const diffMatch = message.match(/difficulty\s+['"]?([A-Z]+)['"]?/i);
        const pType = typeMatch ? typeMatch[1].toUpperCase() : '';
        const diff = diffMatch ? diffMatch[1].toUpperCase() : 'MEDIUM';

        const puzzle = (this as any).generateProceduralLogicPuzzle(pType, diff);
        return {
          response: JSON.stringify(puzzle),
          model: 'mock-gpt-development',
        };
      } else if (message.toLowerCase().includes('matching puzzle') || message.toLowerCase().includes('matching game')) {
        const typeMatch = message.match(/type\s+['"]?([A-Z_]+)['"]?/i);
        const diffMatch = message.match(/difficulty\s+['"]?([A-Z]+)['"]?/i);
        const topicMatch = message.match(/(?:topic\/text|context\/topic):\s+['"]?([^'"]+)['"]?/i);
        const pType = typeMatch ? typeMatch[1].toUpperCase() : '';
        const diff = diffMatch ? diffMatch[1].toUpperCase() : 'MEDIUM';
        const topic = topicMatch ? topicMatch[1] : '';

        const puzzle = (this as any).generateProceduralMatchingPuzzle(pType, diff, topic);
        return {
          response: JSON.stringify(puzzle),
          model: 'mock-gpt-development',
        };
      }

      throw new ServiceUnavailableException('AI guidance is not configured.');
    }

    try {
      const isLogicPuzzle = message.toLowerCase().includes('logic puzzle') || message.toLowerCase().includes('logical thinking');
      const isMatchingPuzzle = message.toLowerCase().includes('matching puzzle') || message.toLowerCase().includes('matching game');
      const systemContent = isLogicPuzzle
        ? "You are an AI puzzle designer. Generate a logical thinking puzzle matching the requested type and difficulty. Return ONLY a valid JSON object matching the format: { \"type\": \"PATTERN_RECOGNITION\" | \"SHAPE_SEQUENCE\" | \"ODD_ONE_OUT\" | \"BLOCK_ARRANGEMENT\", \"difficulty\": \"EASY\" | \"MEDIUM\" | \"HARD\", \"instruction\": \"...\", ... } and do NOT wrap in markdown code blocks."
        : isMatchingPuzzle
        ? "You are an AI matching puzzle designer. Generate an interactive matching game matching the requested type and difficulty. Return ONLY a valid JSON object matching the format: { \"type\": \"MATCH_IMAGE_IMAGE\" | \"MATCH_IMAGE_WORD\" | \"MATCH_WORD_WORD\" | \"MATCH_SHAPE_SHADOW\" | \"MATCH_PATTERN\", \"difficulty\": \"EASY\" | \"MEDIUM\" | \"HARD\", \"instruction\": \"...\", \"pairs\": [ { \"id\": \"...\", \"left\": \"...\", \"right\": \"...\", \"leftType\": \"icon\" | \"text\" | \"shape\" | \"pattern\", \"rightType\": \"icon\" | \"text\" | \"shadow\" | \"shape\", \"leftColor\": \"...\", \"rightColor\": \"...\" } ], \"leftItems\": [ { \"id\": \"...\", \"content\": \"...\", \"type\": \"...\", \"color\": \"...\" } ], \"rightItems\": [ { \"id\": \"...\", \"content\": \"...\", \"type\": \"...\", \"color\": \"...\" } ] } and do NOT wrap in markdown code blocks."
        : `You are the AI Admissions Assistant for this school. Answer parent questions professionally using only the context below.\n\nContext:\n${context}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: systemContent,
              },
              { role: 'user', content: message },
            ],
            temperature: 0.7,
          }),
        });

      const data = await response.json();
      if (!response.ok || !data.choices?.[0]?.message?.content) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }
      let content = data.choices[0].message.content.trim();
      if (message.includes('Proofread, fix any spelling or grammar errors')) {
        content = content
          .replace(/^```(?:text)?\s*/i, '')
          .replace(/```$/i, '')
          .replace(/^['"]|['"]$/g, '')
          .replace(/\b([a-z])\1+\b/gi, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        try {
          content = await this.proofreadWithLanguageTool(content);
        } catch (error) {
          console.warn('Final feedback proofread unavailable:', error);
        }
      }
      return {
        response: content,
        model: process.env.AI_MODEL || 'gpt-4o',
      };
    } catch (error) {
      console.error('AI provider request failed:', error);
      throw new ServiceUnavailableException(
        'AI guidance is temporarily unavailable.',
      );
    }
  }

  private async proofreadWithLanguageTool(text: string): Promise<string> {
    if (!text.trim()) return text;
    const endpoint = process.env.LANGUAGE_TOOL_URL || 'https://api.languagetool.org/v2/check';
    const body = new URLSearchParams({ text, language: 'en-US' });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`LanguageTool returned ${response.status}`);
    const payload = await response.json() as { matches?: Array<{ offset: number; length: number; replacements?: Array<{ value: string }> }> };
    const corrections = (payload.matches || [])
      .filter(match => match.replacements?.[0]?.value !== undefined)
      .sort((a, b) => b.offset - a.offset);

    let corrected = text;
    for (const match of corrections) {
      const replacement = match.replacements![0].value;
      corrected = corrected.slice(0, match.offset) + replacement + corrected.slice(match.offset + match.length);
    }
    return corrected;
  }

  private async transcribeAssessmentMedia(mediaUrl: string, apiKey: string): Promise<string> {
    if (!mediaUrl) throw new BadRequestException('A student recording is required for AI evaluation.');

    let mediaBlob: Blob;
    let mimeType = 'audio/webm';
    if (mediaUrl.startsWith('data:')) {
      const match = mediaUrl.match(/^data:([^;,]+);base64,(.+)$/s);
      if (!match) throw new BadRequestException('The submitted recording format is invalid.');
      mimeType = match[1];
      mediaBlob = new Blob([Buffer.from(match[2], 'base64')], { type: mimeType });
    } else {
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) throw new ServiceUnavailableException('The submitted recording could not be loaded.');
      mimeType = mediaResponse.headers.get('content-type') || mimeType;
      mediaBlob = await mediaResponse.blob();
    }

    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'webm';
    const form = new FormData();
    form.append('file', mediaBlob, `student-recording.${extension}`);
    form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const payload: any = await response.json();
    if (!response.ok || !payload?.text) {
      throw new ServiceUnavailableException(payload?.error?.message || 'The recording could not be transcribed.');
    }
    return String(payload.text).trim();
  }

  async evaluateReading(readingText: string, audioUrl: string, schoolId: string): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('dummy')) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Live AI evaluation is not configured.');
      }
      const evidenceScore = Math.min(88, Math.max(68, 68 + Math.round(audioUrl.length / 25000)));
      return {
        pronunciation: evidenceScore,
        accuracy: evidenceScore + 2,
        fluency: evidenceScore - 2,
        speed: evidenceScore,
        voiceClarity: evidenceScore + 1,
        confidence: evidenceScore - 1,
        wordRecognition: evidenceScore + 2,
        completeness: evidenceScore,
        overallScore: evidenceScore,
        missedWords: [],
        mispronouncedWords: [],
        pauseDetection: 'Recording received; detailed pause analysis requires live AI transcription.',
        feedback: {
          strengths: ['A complete reading recording was submitted successfully.'],
          improvements: ['Teacher review is recommended because live AI transcription is not configured.'],
        },
        evaluationMode: 'DEVELOPMENT_FALLBACK',
      };
    }

    try {
      const transcript = await this.transcribeAssessmentMedia(audioUrl, apiKey);
      const prompt = `You are an AI Reading Evaluator. Analyze a student reading the passage: "${readingText}".
      Actual transcript from the student's submitted recording: "${transcript}".
      Evaluate only evidence present in this transcript. Never assume a typical attempt and never invent missed or mispronounced words.
      Evaluate these parameters out of 100:
      - pronunciation
      - accuracy
      - fluency
      - speed
      - voiceClarity
      - confidence
      - wordRecognition
      - completeness
      - overallScore
      Also identify:
      - missedWords (array of words missed)
      - mispronouncedWords (array of words mispronounced)
      - pauseDetection (string describing pause behaviors)
      And write:
      - feedback with "strengths" (array of strings) and "improvements" (array of strings).
      
      Return raw JSON in this format:
      {
        "pronunciation": number,
        "accuracy": number,
        "fluency": number,
        "speed": number,
        "voiceClarity": number,
        "confidence": number,
        "wordRecognition": number,
        "completeness": number,
        "overallScore": number,
        "missedWords": ["word1"],
        "mispronouncedWords": ["word1"],
        "pauseDetection": "description",
        "feedback": {
          "strengths": ["strength1"],
          "improvements": ["improvement1"]
        }
      }
      Do NOT wrap in markdown code blocks.`;

      const response = await this.chat(prompt, schoolId);
      const cleanedJson = response.response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (err: any) {
      console.error('Live reading AI evaluation failed:', err.message);
      throw err instanceof ServiceUnavailableException ? err : new ServiceUnavailableException('Live reading evaluation failed.');
    }
  }

  async evaluateSpeaking(activityType: string, speakingPrompt: string, videoUrl: string, schoolId: string): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('dummy')) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Live AI evaluation is not configured.');
      }
      const evidenceScore = Math.min(90, Math.max(70, 70 + Math.round(videoUrl.length / 75000)));
      return {
        pronunciation: evidenceScore,
        grammar: evidenceScore - 2,
        vocabulary: evidenceScore,
        sentenceFormation: evidenceScore - 1,
        confidence: evidenceScore + 1,
        voiceClarity: evidenceScore,
        fluency: evidenceScore - 1,
        communicationSkills: evidenceScore,
        speed: evidenceScore,
        eyeContact: null,
        facialEngagement: null,
        overallScore: evidenceScore,
        feedback: {
          strengths: ['A complete speaking recording was submitted successfully.'],
          improvements: ['Teacher review is recommended because live AI transcription is not configured.'],
        },
        evaluationMode: 'DEVELOPMENT_FALLBACK',
      };
    }

    try {
      const transcript = await this.transcribeAssessmentMedia(videoUrl, apiKey);
      const prompt = `You are an AI English Speaking Evaluator. Evaluate the speaking performance on the activity type "${activityType}" with prompt "${speakingPrompt}".
      Actual transcript from the student's submitted recording: "${transcript}".
      Evaluate only evidence present in the transcript. Never invent words, behavior, eye contact, or facial engagement.
      Evaluate these parameters out of 100:
      - pronunciation
      - grammar
      - vocabulary
      - sentenceFormation
      - confidence
      - voiceClarity
      - fluency
      - communicationSkills
      - speed
      - eyeContact: return null because transcript-only evaluation cannot verify it
      - facialEngagement: return null because transcript-only evaluation cannot verify it
      - overallScore
      And write:
      - feedback with "strengths" (array of strings) and "improvements" (array of strings).
      
      Return raw JSON in this format:
      {
        "pronunciation": number,
        "grammar": number,
        "vocabulary": number,
        "sentenceFormation": number,
        "confidence": number,
        "voiceClarity": number,
        "fluency": number,
        "communicationSkills": number,
        "speed": number,
        "eyeContact": null,
        "facialEngagement": null,
        "overallScore": number,
        "feedback": {
          "strengths": ["strength1"],
          "improvements": ["improvement1"]
        }
      }
      Do NOT wrap in markdown code blocks.`;

      const response = await this.chat(prompt, schoolId);
      const cleanedJson = response.response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (err: any) {
      console.error('Live speaking AI evaluation failed:', err.message);
      throw err instanceof ServiceUnavailableException ? err : new ServiceUnavailableException('Live speaking evaluation failed.');
    }
  }

  async evaluateListening(
    transcript: string,
    questions: any[],
    answers: any[],
    playsUsed: number,
    timeTaken: number,
    schoolId: string
  ): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('dummy')) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Live AI evaluation is not configured.');
      }
      const answeredScores = questions.map((question) => {
        const answer = answers.find((item) => item.questionId === question.id);
        if (!answer) return 0;
        if (question.type === 'MCQ') {
          return answer.selectedOption === question.correctAnswer ? 100 : 0;
        }
        return String(answer.writtenAnswer || '').trim().length >= 10 ? 70 : 0;
      });
      const responseAccuracy = answeredScores.length
        ? Math.round(answeredScores.reduce((sum, score) => sum + score, 0) / answeredScores.length)
        : 0;
      const attentionScore = Math.max(0, Math.min(100, 100 - Math.max(0, playsUsed - 1) * 10));
      const overallScore = Math.round((responseAccuracy * 0.8) + (attentionScore * 0.2));
      return {
        listeningAccuracy: responseAccuracy,
        comprehensionScore: responseAccuracy,
        attentionScore,
        responseAccuracy,
        overallScore,
        feedback: {
          strengths: playsUsed > 0 ? ['The listening material was completed.'] : [],
          improvements: responseAccuracy < 50
            ? ['Review the listening passage and answer every question.']
            : ['Continue checking responses carefully before submission.'],
        },
        evaluationMode: 'DEVELOPMENT_FALLBACK',
      };
    }

    try {
      const prompt = `You are an AI English Listening Skills Evaluator. Evaluate a student's listening performance based on the following:
      - Listening Transcript/Material: "${transcript}"
      - Questions asked: ${JSON.stringify(questions)}
      - Student's Answers: ${JSON.stringify(answers)}
      - Audio Plays Used: ${playsUsed}
      - Time Taken: ${timeTaken} seconds

      Evaluate these parameters out of 100:
      - listeningAccuracy
      - comprehensionScore
      - attentionScore
      - responseAccuracy
      - overallScore
      And write:
      - feedback with "strengths" (array of strings) and "improvements" (array of strings).

      Return raw JSON in this format:
      {
        "listeningAccuracy": number,
        "comprehensionScore": number,
        "attentionScore": number,
        "responseAccuracy": number,
        "overallScore": number,
        "feedback": {
          "strengths": ["strength1"],
          "improvements": ["improvement1"]
        }
      }
      Do NOT wrap in markdown code blocks.`;

      const response = await this.chat(prompt, schoolId);
      const cleanedJson = response.response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (err: any) {
      console.error('Live listening AI evaluation failed:', err.message);
      throw err instanceof ServiceUnavailableException ? err : new ServiceUnavailableException('Live listening evaluation failed.');
    }
  }

  generateProceduralLogicPuzzle(type: string, difficulty: string) {
    const puzzleTypes = ['PATTERN_RECOGNITION', 'SHAPE_SEQUENCE', 'ODD_ONE_OUT', 'BLOCK_ARRANGEMENT'];
    const pType = puzzleTypes.includes(type) ? type : puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
    const diff = ['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ? difficulty : 'MEDIUM';

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'];

    const fisherYatesShuffle = (array: any[]) => {
      let shuffled = [...array];
      let attempts = 0;
      while (attempts < 15) {
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const isSorted = shuffled.every((val, index) => val.id === array[index].id);
        if (!isSorted) break;
        attempts++;
      }
      return shuffled;
    };

    if (pType === 'PATTERN_RECOGNITION') {
      const len = diff === 'EASY' ? 4 : 6;
      const patternShapes = [];
      const itemA = { shape: shapes[Math.floor(Math.random() * shapes.length)], color: colors[0] };
      const itemB = { shape: shapes[Math.floor(Math.random() * shapes.length)], color: colors[1] };
      while (itemB.shape === itemA.shape && itemB.color === itemA.color) {
        itemB.shape = shapes[Math.floor(Math.random() * shapes.length)];
        itemB.color = colors[Math.floor(Math.random() * colors.length)];
      }

      for (let i = 0; i < len; i++) {
        patternShapes.push(i % 2 === 0 ? { ...itemA } : { ...itemB });
      }

      const emptyIndex = len - 1;
      const correctItem = { ...patternShapes[emptyIndex] };
      patternShapes[emptyIndex] = null; // empty position

      const candidates = [correctItem];
      while (candidates.length < 4) {
        const item = {
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          color: colors[Math.floor(Math.random() * colors.length)]
        };
        if (!candidates.some(c => c.shape === item.shape && c.color === item.color)) {
          candidates.push(item);
        }
      }
      // Shuffle candidates
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      return {
        type: 'PATTERN_RECOGNITION',
        difficulty: diff,
        instruction: 'Complete the visual pattern by dragging the correct shape into the empty position.',
        pattern: patternShapes,
        emptyIndex,
        options: candidates.map(c => `${c.shape}:${c.color}`),
        correctAnswer: `${correctItem.shape}:${correctItem.color}`
      };
    } else if (pType === 'MATRIX_REASONING') {
      const baseShape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const matrix = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const rotation = (r * 30 + c * 30) % 360;
          matrix.push({ shape: baseShape, color: baseColor, rotation });
        }
      }
      const correctItem = { ...matrix[8] };
      matrix[8] = null;

      const candidates = [correctItem];
      while (candidates.length < 4) {
        candidates.push({
          shape: baseShape,
          color: baseColor,
          rotation: (Math.floor(Math.random() * 12) * 30) % 360
        });
      }
      candidates.sort(() => Math.random() - 0.5);

      return {
        type: 'MATRIX_REASONING',
        difficulty: diff,
        instruction: 'Complete the missing block in the 3x3 matrix by dragging the correct tile.',
        matrix,
        options: candidates.map(c => `rotate:${c.rotation}`),
        correctAnswer: `rotate:${correctItem.rotation}`
      };
    } else if (pType === 'SHAPE_SEQUENCE') {
      const baseShape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const count = diff === 'EASY' ? 3 : diff === 'MEDIUM' ? 4 : 5;
      const sequence = [];
      for (let i = 0; i < count; i++) {
        sequence.push({ id: `item_${i}`, shape: baseShape, color: baseColor, size: 40 + i * 20, label: `Size ${i + 1}` });
      }
      const shuffled = fisherYatesShuffle(sequence);

      return {
        type: 'SHAPE_SEQUENCE',
        difficulty: diff,
        instruction: 'Arrange shuffled shapes into the correct logical sequence (ascending size) using drag-and-drop.',
        correctOrder: sequence.map(s => s.id),
        shuffled,
        options: ['sorted_sequence'],
        correctAnswer: 'sorted_sequence'
      };
    } else if (pType === 'ODD_ONE_OUT') {
      const count = diff === 'EASY' ? 3 : diff === 'MEDIUM' ? 4 : 5;
      const baseShape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const oddShape = shapes[(shapes.indexOf(baseShape) + 1) % shapes.length];
      const items = [];
      const oddIndex = Math.floor(Math.random() * count);
      for (let i = 0; i < count; i++) {
        if (i === oddIndex) {
          items.push({ id: `item_${i}`, shape: oddShape, color: baseColor, animation: 'float', isOdd: true });
        } else {
          items.push({ id: `item_${i}`, shape: baseShape, color: baseColor, animation: 'float', isOdd: false });
        }
      }

      return {
        type: 'ODD_ONE_OUT',
        difficulty: diff,
        instruction: 'Identify and tap the item that does not belong in the group.',
        items,
        options: items.map(i => i.id),
        correctAnswer: `item_${oddIndex}`
      };
    } else {
      const count = diff === 'EASY' ? 3 : diff === 'MEDIUM' ? 4 : 5;
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
      const blocks = [];
      for (let i = 0; i < count; i++) {
        blocks.push({ id: `block_${i}`, height: 50 + i * 30, color: colors[i % colors.length], value: i + 1 });
      }
      const shuffled = fisherYatesShuffle(blocks);

      return {
        type: 'BLOCK_ARRANGEMENT',
        difficulty: diff,
        instruction: 'Rearrange blocks in ascending order of their heights.',
        correctOrder: blocks.map(b => b.id),
        shuffled,
        options: ['sorted_blocks'],
        correctAnswer: 'sorted_blocks'
      };
    }
  }

  generateProceduralMatchingPuzzle(type: string, difficulty: string, topic?: string) {
    const puzzleTypes = ['MATCH_IMAGE_IMAGE', 'MATCH_IMAGE_WORD', 'MATCH_WORD_WORD', 'MATCH_SHAPE_SHADOW', 'MATCH_PATTERN'];
    const pType = puzzleTypes.includes(type) ? type : puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
    const diff = ['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ? difficulty : 'MEDIUM';
    const count = diff === 'EASY' ? 3 : diff === 'MEDIUM' ? 4 : 5;

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

    const fisherYatesShuffle = (array: any[]) => {
      let shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    let pairs: any[] = [];
    let instruction = '';

    const lowTopic = (topic || '').toLowerCase();
    if (lowTopic.includes('family') || lowTopic.includes('lunch') || lowTopic.includes('dinner') || lowTopic.includes('ate') || lowTopic.includes('pieces')) {
      instruction = 'Match the family and meal vocabulary words to their correct meaning.';
      const pool = [
        { left: 'family', right: 'group of related people', leftType: 'text', rightType: 'text', leftColor: '#f43f5e', rightColor: '#ffffff' },
        { left: 'lunch', right: 'midday meal', leftType: 'text', rightType: 'text', leftColor: '#3b82f6', rightColor: '#ffffff' },
        { left: 'dinner', right: 'evening meal', leftType: 'text', rightType: 'text', leftColor: '#10b981', rightColor: '#ffffff' },
        { left: 'pieces', right: 'portions of a food item', leftType: 'text', rightType: 'text', leftColor: '#f59e0b', rightColor: '#ffffff' }
      ];
      pairs = pool.slice(0, count).map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.left,
        right: item.right,
        leftType: item.leftType,
        rightType: item.rightType,
        leftColor: item.leftColor,
        rightColor: item.rightColor
      }));
    } else if (lowTopic.includes('sun') || lowTopic.includes('solar') || lowTopic.includes('planet') || lowTopic.includes('earth')) {
      instruction = 'Match the solar system items to their definitions.';
      const pool = [
        { left: 'Sun', right: 'Star at the center', leftType: 'text', rightType: 'text', leftColor: '#f59e0b', rightColor: '#ffffff' },
        { left: 'Earth', right: 'Third planet from Sun', leftType: 'text', rightType: 'text', leftColor: '#3b82f6', rightColor: '#ffffff' },
        { left: 'Moon', right: 'Natural satellite of Earth', leftType: 'text', rightType: 'text', leftColor: '#8b5cf6', rightColor: '#ffffff' },
        { left: 'Orbit', right: 'Curved path of space body', leftType: 'text', rightType: 'text', leftColor: '#10b981', rightColor: '#ffffff' }
      ];
      pairs = pool.slice(0, count).map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.left,
        right: item.right,
        leftType: item.leftType,
        rightType: item.rightType,
        leftColor: item.leftColor,
        rightColor: item.rightColor
      }));
    } else if (pType === 'MATCH_IMAGE_IMAGE') {
      instruction = 'Match the related pictures by dragging.';
      const pool = [
        { left: 'apple', right: 'tree', leftColor: '#f43f5e', rightColor: '#10b981' },
        { left: 'fish', right: 'water', leftColor: '#3b82f6', rightColor: '#14b8a6' },
        { left: 'key', right: 'lock', leftColor: '#f59e0b', rightColor: '#8b5cf6' },
        { left: 'pencil', right: 'paper', leftColor: '#8b5cf6', rightColor: '#ec4899' },
        { left: 'sun', right: 'cloud', leftColor: '#f59e0b', rightColor: '#3b82f6' },
        { left: 'moon', right: 'star', leftColor: '#8b5cf6', rightColor: '#f59e0b' }
      ];
      const selected = fisherYatesShuffle(pool).slice(0, count);
      pairs = selected.map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.left,
        right: item.right,
        leftType: 'icon',
        rightType: 'icon',
        leftColor: item.leftColor,
        rightColor: item.rightColor
      }));
    } else if (pType === 'MATCH_IMAGE_WORD') {
      instruction = 'Drag each picture to its correct word name.';
      const pool = [
        { left: 'dog', right: 'Dog', leftColor: '#f43f5e' },
        { left: 'cat', right: 'Cat', leftColor: '#3b82f6' },
        { left: 'car', right: 'Car', leftColor: '#10b981' },
        { left: 'tree', right: 'Tree', leftColor: '#10b981' },
        { left: 'star', right: 'Star', leftColor: '#f59e0b' },
        { left: 'moon', right: 'Moon', leftColor: '#8b5cf6' },
        { left: 'sun', right: 'Sun', leftColor: '#f59e0b' }
      ];
      const selected = fisherYatesShuffle(pool).slice(0, count);
      pairs = selected.map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.left,
        right: item.right,
        leftType: 'icon',
        rightType: 'text',
        leftColor: item.leftColor,
        rightColor: '#ffffff'
      }));
    } else if (pType === 'MATCH_WORD_WORD') {
      instruction = 'Match the related word pairs.';
      const pool = [
        { left: 'Happy', right: 'Joyful' },
        { left: 'Hot', right: 'Cold' },
        { left: 'Big', right: 'Small' },
        { left: 'Fast', right: 'Slow' },
        { left: 'Doctor', right: 'Hospital' },
        { left: 'Teacher', right: 'School' },
        { left: 'Chef', right: 'Kitchen' },
        { left: 'Fire', right: 'Flame' }
      ];
      const selected = fisherYatesShuffle(pool).slice(0, count);
      pairs = selected.map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.left,
        right: item.right,
        leftType: 'text',
        rightType: 'text',
        leftColor: '#ffffff',
        rightColor: '#ffffff'
      }));
    } else if (pType === 'MATCH_SHAPE_SHADOW') {
      instruction = 'Match each colored shape with its shadow silhouette.';
      const pool = [
        { shape: 'circle' },
        { shape: 'square' },
        { shape: 'triangle' },
        { shape: 'diamond' },
        { shape: 'star' },
        { shape: 'hexagon' }
      ];
      const selected = fisherYatesShuffle(pool).slice(0, count);
      pairs = selected.map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.shape,
        right: item.shape,
        leftType: 'shape',
        rightType: 'shadow',
        leftColor: colors[idx % colors.length],
        rightColor: '#1e293b' // dark shadow
      }));
    } else {
      instruction = 'Complete each visual pattern with the correct shape.';
      const pool = [
        { pattern: 'circle:square:circle', next: 'square' },
        { pattern: 'triangle:star:triangle', next: 'star' },
        { pattern: 'diamond:hexagon:diamond', next: 'hexagon' },
        { pattern: 'square:circle:square', next: 'circle' },
        { pattern: 'hexagon:triangle:hexagon', next: 'triangle' }
      ];
      const selected = fisherYatesShuffle(pool).slice(0, count);
      pairs = selected.map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.pattern,
        right: item.next,
        leftType: 'pattern',
        rightType: 'shape',
        leftColor: colors[idx % colors.length],
        rightColor: colors[idx % colors.length]
      }));
    }

    const leftItems = pairs.map(p => ({ id: p.id, content: p.left, type: p.leftType, color: p.leftColor }));
    const rightItems = pairs.map(p => ({ id: p.id, content: p.right, type: p.rightType, color: p.rightColor }));

    // Shuffle left items and right items separately
    const shuffledLeft = fisherYatesShuffle(leftItems);
    const shuffledRight = fisherYatesShuffle(rightItems);

    return {
      type: pType,
      difficulty: diff,
      instruction,
      pairs,
      leftItems: shuffledLeft,
      rightItems: shuffledRight,
      options: ['matched_pairs'],
      correctAnswer: 'matched_pairs'
    };
  }
}

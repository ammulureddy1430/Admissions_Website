import { ActiveRule, RuleMode, ObjectColor, ObjectShape, DecisionSide } from './Types';

export class RuleEngine {
  public activeRule!: ActiveRule;
  private version = 1;

  constructor() {
    this.initDefaultRule();
  }

  private initDefaultRule() {
    this.activeRule = {
      mode: 'color',
      version: this.version,
      description: 'RED ➔ LEFT, BLUE ➔ RIGHT',
      colorMapping: {
        red: 'left',
        blue: 'right',
        green: 'left',
        yellow: 'right',
      },
    };
  }

  /**
   * Generates a new rule mapping for the active level and mode.
   * Can reverse mappings or switch dimensions (color to shape).
   */
  public generateNextRule(mode: RuleMode, level: number): ActiveRule {
    this.version++;
    
    let description = '';
    let colorMapping: Record<ObjectColor, DecisionSide> | undefined;
    let shapeMapping: Record<ObjectShape, DecisionSide> | undefined;
    let combinationRule: ActiveRule['combinationRule'];

    // Controlled randomization or deterministic based on level
    if (mode === 'color') {
      const isReversed = level === 2 || Math.random() > 0.5;
      colorMapping = {
        red: isReversed ? 'right' : 'left',
        blue: isReversed ? 'left' : 'right',
        green: isReversed ? 'right' : 'left',
        yellow: isReversed ? 'left' : 'right',
      };
      if (level <= 2) {
        description = isReversed
          ? 'RED ➔ RIGHT, BLUE ➔ LEFT'
          : 'RED ➔ LEFT, BLUE ➔ RIGHT';
      } else {
        description = isReversed
          ? 'RED & GREEN ➔ RIGHT, BLUE & YELLOW ➔ LEFT'
          : 'RED & GREEN ➔ LEFT, BLUE & YELLOW ➔ RIGHT';
      }
    } else if (mode === 'shape') {
      const isReversed = Math.random() > 0.5;
      shapeMapping = {
        circle: isReversed ? 'right' : 'left',
        triangle: isReversed ? 'left' : 'right',
        square: isReversed ? 'right' : 'left',
        star: isReversed ? 'left' : 'right',
      };
      if (level <= 2) {
        description = isReversed
          ? 'CIRCLE ➔ RIGHT, TRIANGLE ➔ LEFT'
          : 'CIRCLE ➔ LEFT, TRIANGLE ➔ RIGHT';
      } else {
        description = isReversed
          ? 'CIRCLE & SQUARE ➔ RIGHT, TRIANGLE & STAR ➔ LEFT'
          : 'CIRCLE & SQUARE ➔ LEFT, TRIANGLE & STAR ➔ RIGHT';
      }
    } else if (mode === 'reverseColor') {
      colorMapping = {
        red: 'right',
        blue: 'left',
        green: 'right',
        yellow: 'left',
      };
      description = 'REVERSE COLOR RULE: RED ➔ RIGHT, BLUE ➔ LEFT';
    } else if (mode === 'combination') {
      const targetColors: ObjectColor[] = ['red', 'blue', 'green', 'yellow'];
      const targetShapes: ObjectShape[] = ['circle', 'triangle', 'square', 'star'];
      
      // Select a target color/shape based on level difficulty (e.g. Red Circle is standard)
      const targetColor = level >= 7 ? targetColors[Math.floor(Math.random() * targetColors.length)] : 'red';
      const targetShape = level >= 7 ? targetShapes[Math.floor(Math.random() * targetShapes.length)] : 'circle';
      const targetSide: DecisionSide = Math.random() > 0.5 ? 'right' : 'left';
      const defaultSide: DecisionSide = targetSide === 'left' ? 'right' : 'left';

      combinationRule = {
        targetColor,
        targetShape,
        targetSide,
        defaultSide,
      };

      description = `${targetColor.toUpperCase()} ${targetShape.toUpperCase()} ➔ ${targetSide.toUpperCase()}, OTHER ➔ ${defaultSide.toUpperCase()}`;
    }

    this.activeRule = {
      mode,
      version: this.version,
      description,
      colorMapping,
      shapeMapping,
      combinationRule,
    };

    return this.activeRule;
  }

  /**
   * Determine correct side based on the active rule.
   */
  public getCorrectSide(color: ObjectColor, shape: ObjectShape): DecisionSide | null {
    const { mode, colorMapping, shapeMapping, combinationRule } = this.activeRule;

    if (mode === 'color' || mode === 'reverseColor') {
      return colorMapping ? colorMapping[color] : null;
    }

    if (mode === 'shape') {
      return shapeMapping ? shapeMapping[shape] : null;
    }

    if (mode === 'combination' && combinationRule) {
      const match = color === combinationRule.targetColor && shape === combinationRule.targetShape;
      return match ? combinationRule.targetSide : combinationRule.defaultSide;
    }

    return null;
  }
}

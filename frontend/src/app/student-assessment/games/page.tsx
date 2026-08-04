import { redirect } from "next/navigation";

export default function StudentGamesRedirect() {
  redirect("/student-assessment/dashboard");
}

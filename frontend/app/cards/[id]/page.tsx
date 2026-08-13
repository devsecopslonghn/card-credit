import { redirect } from "next/navigation";

/** Card-level legacy transaction editor removed; use the Financial Domain screens. */
export default function CardDetailRedirect() {
  redirect("/cards");
}

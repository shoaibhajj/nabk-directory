import { redirect } from "next/navigation";

export default async function EditIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/listings/${id}/edit/basics`);
}

import { fetchGroups } from "@/lib/groups";
import GroupDetail from "./group-detail";

export async function generateStaticParams() {
  const groups = await fetchGroups();
  return groups.map((g) => ({ slug: g.slug }));
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GroupDetail slug={slug} />;
}

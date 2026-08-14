import CapsuleDetail from "@/components/CapsuleDetail";

type CapsulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CapsulePage({ params }: CapsulePageProps) {
  const { id } = await params;
  return <CapsuleDetail id={id} />;
}

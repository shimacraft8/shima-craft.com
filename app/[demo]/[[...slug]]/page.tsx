import { notFound } from "next/navigation";
import { DemoApp } from "@/components/DemoApp";
import { demos } from "@/lib/demoConfigs";

export function generateStaticParams() {
  return demos.flatMap((demo) => {
    const params: { demo: string; slug: string[] }[] = [{ demo: demo.id, slug: [] }];
    demo.pages.forEach((page) => {
      params.push({
        demo: demo.id,
        slug: page.path.split("/").filter(Boolean),
      });
    });
    return params;
  });
}

export default function DemoPage({
  params,
}: {
  params: { demo: string; slug?: string[] };
}) {
  const demo = demos.find((item) => item.id === params.demo);
  if (!demo) notFound();

  const path = `/${(params.slug ?? []).join("/")}`.replace(/\/$/, "") || "/";
  return <DemoApp demo={demo} activePath={path} />;
}

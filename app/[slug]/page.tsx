import { notFound } from "next/navigation";
import { TOOLS, toolBySlug } from "@/lib/registry";

export function generateStaticParams() {
  return TOOLS.map((entry) => ({ slug: entry.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = toolBySlug(slug);
  // Just the name: the root layout's title template appends " — DevTools",
  // and spelling it out here too produced "JSON Merge — DevTools — DevTools".
  if (!entry) return { title: "Not found" };
  return { title: entry.meta.name, description: entry.meta.blurb };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = toolBySlug(slug);
  // A static segment such as /settings takes precedence over this route, so
  // reaching here with an unknown slug means the tool genuinely does not exist.
  if (!entry) notFound();
  const { Component } = entry;
  return <Component />;
}

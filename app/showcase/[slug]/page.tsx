import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Annotation, BodyCopy, Label, Statement } from "@/components/ui";
import { DEMOS, findDemo } from "../demos";
import { ShowcaseBack } from "../ShowcaseBack";

/*
 * Placeholder for a demo that is planned but not built. Demos with their own
 * route directory take precedence over this one.
 */
export function generateStaticParams() {
  return DEMOS.filter((demo) => !demo.ready).map((demo) => ({ slug: demo.slug }));
}

export async function generateMetadata({ params }: PageProps<"/showcase/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const demo = findDemo(slug);
  return demo
    ? { title: `${demo.name} — Animaxxing`, description: demo.blurb }
    : { title: "Animaxxing" };
}

export default async function DemoPlaceholder({ params }: PageProps<"/showcase/[slug]">) {
  const { slug } = await params;
  const demo = findDemo(slug);
  if (!demo || demo.ready) {
    notFound();
  }
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <ShowcaseBack />
          <div data-page-transition>
            <Label as="p">{demo.before}, animaxxed</Label>
          </div>
          <Statement as="h1" data-page-transition="letters" className="mt-4">
            {demo.name}
          </Statement>
          <div data-page-transition className="mt-8">
            <BodyCopy className="text-muted">{demo.blurb}</BodyCopy>
          </div>
          <div data-page-transition className="mt-12">
            <Annotation>Not built yet</Annotation>
          </div>
        </div>
      </section>
    </main>
  );
}

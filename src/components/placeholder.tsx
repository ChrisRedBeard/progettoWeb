export function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">{text}</p>
    </section>
  );
}

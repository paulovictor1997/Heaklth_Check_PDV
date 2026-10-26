// Página provisória: a visão geral com os cards das lojas entra na Parte 3.
// Por enquanto ela só mostra a paleta, para conferir as cores do tema.
const swatches = [
  { name: "Normal", className: "bg-normal" },
  { name: "Atenção", className: "bg-atencao" },
  { name: "Crítico", className: "bg-critico" },
  { name: "Destaque", className: "bg-destaque" },
];

export default function Home() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Visão geral</h1>
      <p className="text-texto/70">Em construção.</p>
      <ul className="flex flex-wrap gap-3">
        {swatches.map((swatch) => (
          <li key={swatch.name} className="flex items-center gap-2">
            <span className={`size-4 rounded-full ${swatch.className}`} />
            {swatch.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

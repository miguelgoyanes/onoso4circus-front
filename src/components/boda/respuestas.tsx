import type { PreguntaBoda } from "../../api/boda";

// Utilidades compartidas para mostrar y editar respuestas de la boda.

export function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (Array.isArray(valor)) return valor.length ? valor.join(", ") : "—";
  if (typeof valor === "object") {
    const { valor: v, nota } = valor as {
      valor?: unknown;
      nota?: string | null;
    };
    return `${formatearValor(v)}${nota ? ` (${nota})` : ""}`;
  }
  return String(valor);
}

// Valores vigentes: los de la invitación y, aparte, los de cada persona (por id).
export interface ValoresBoda {
  invitacion: Record<string, unknown>;
  personas: Record<string, Record<string, unknown>>;
}

function iguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ¿Le corresponde esta pregunta a la invitación (o a esta persona)? Mismas reglas que el backend:
// una pregunta por persona que depende de otra por persona usa las respuestas de esa persona; una de la
// invitación que depende de una por persona se cumple si la cumple alguna.
export function aplicaPregunta(
  pregunta: PreguntaBoda,
  preguntas: readonly PreguntaBoda[],
  valores: ValoresBoda,
  personaId: string | null,
): boolean {
  const condicion = pregunta.condicion;
  if (!condicion) return true;
  const referida = preguntas.find((p) => p.clave === condicion.clave);
  if (!referida || referida.ambito === "invitacion") {
    return iguales(valores.invitacion[condicion.clave], condicion.igual);
  }
  if (pregunta.ambito === "persona" && personaId) {
    return iguales(
      valores.personas[personaId]?.[condicion.clave],
      condicion.igual,
    );
  }
  return Object.values(valores.personas).some((v) =>
    iguales(v[condicion.clave], condicion.igual),
  );
}

// Respuesta mostrada de forma legible (no editable).
export function ValorRespuesta({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined || valor === "")
    return <span className="boda-sin-respuesta">Sin responder</span>;
  if (typeof valor === "boolean") {
    return (
      <span className={`boda-valor-si-no ${valor ? "si" : "no"}`}>
        {valor ? "Sí" : "No"}
      </span>
    );
  }
  if (Array.isArray(valor)) {
    return (
      <span className="boda-etiquetas">
        {valor.map((v) => (
          <span key={String(v)} className="boda-etiqueta">
            {String(v)}
          </span>
        ))}
      </span>
    );
  }
  return <span className="boda-valor-texto">{String(valor)}</span>;
}

export function CampoRespuesta({
  pregunta,
  valor,
  onChange,
}: {
  pregunta: PreguntaBoda;
  valor: unknown;
  onChange: (valor: unknown) => void;
}) {
  switch (pregunta.tipo) {
    case "si_no":
      return (
        <div className="boda-segmentado">
          {[
            { v: true, t: "Sí" },
            { v: false, t: "No" },
          ].map((o) => (
            <button
              key={o.t}
              type="button"
              className={valor === o.v ? "activo" : ""}
              onClick={() => onChange(valor === o.v ? undefined : o.v)}
            >
              {o.t}
            </button>
          ))}
        </div>
      );
    case "opcion":
      return (
        <div className="boda-etiquetas">
          {(pregunta.opciones ?? []).map((o) => (
            <button
              key={o}
              type="button"
              className={`boda-etiqueta boda-etiqueta-boton ${valor === o ? "activa" : ""}`}
              onClick={() => onChange(valor === o ? undefined : o)}
            >
              {o}
            </button>
          ))}
        </div>
      );
    case "multiopcion": {
      const marcadas = Array.isArray(valor) ? (valor as string[]) : [];
      return (
        <div className="boda-etiquetas">
          {(pregunta.opciones ?? []).map((o) => (
            <button
              key={o}
              type="button"
              className={`boda-etiqueta boda-etiqueta-boton ${marcadas.includes(o) ? "activa" : ""}`}
              onClick={() => {
                const siguiente = marcadas.includes(o)
                  ? marcadas.filter((m) => m !== o)
                  : [...marcadas, o];
                onChange(siguiente.length ? siguiente : undefined);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      );
    }
    case "texto_largo":
      return (
        <textarea
          className="boda-input boda-input-area"
          rows={3}
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case "numero":
      return (
        <input
          className="boda-input"
          type="number"
          value={typeof valor === "number" ? valor : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );
    case "fecha":
      return (
        <input
          className="boda-input"
          type="date"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    default:
      return (
        <input
          className="boda-input"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
  }
}

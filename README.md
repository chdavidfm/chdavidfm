# David Flórez

París / Alicante. GitHub es el músculo de **toda** la vida: skills, lab, código. Un producto en producción es **un** nodo, no la cuenta.

Cinco años detrás de una barra antes de escribir esto. El producto que sí existe: [userenovo.com](https://userenovo.com) — IA de **reseñas** para hostelería independiente (ES/FR). En producción, en dos locales propios. Contenido / RRSS: no está.

## Qué hay aquí

| Superficie | Qué es |
|---|---|
| [userenovo.com](https://userenovo.com) | El SaaS. Reseñas reales. Todavía 0 clientes de pago. |
| [`skills`](https://github.com/chdavidfm/skills) | Agent Skills que corro — `github` · `ship` · `absorb` · `verify` · `skill-author` |
| [`rag-agent-lab`](https://github.com/chdavidfm/rag-agent-lab) | Lab de retrieval. **No** es el producto. |
| `renovo-core` | El repo que corre producción. Privado. |

## Cómo se trabaja

```
brief  →  PR  →  CI  →  merge  →  prod
```

Claude escribe el brief. Cursor ejecuta. `ship` vigila CI. `verify` no deja pasar un “listo” sin comando. Nada se marca hecho por una afirmación.

Tres reglas que no doblo:

- **Los secretos no entran en git.** Ni una vez, ni “un momento”.
- **El producto no enseña un número que no midió.** Un 462 € inventado en un panel es peor que un estado vacío: el dueño decide encima.
- **CI verde no es feature verificado.** `curl` prueba que el servidor contestó. No prueba que el dueño pueda usar la pantalla.

## Reciente

<!-- pulse:start -->

| Repo | Último cambio | Fecha |
|---|---|---|
| [`chdavidfm`](https://github.com/chdavidfm/chdavidfm) | Replace third-party widgets with a self-updating activity block | 2026-08-26 |
| [`skills`](https://github.com/chdavidfm/skills) | docs: human README, real CONTRIBUTING, domain issue templates | 2026-08-26 |
| [`rag-agent-lab`](https://github.com/chdavidfm/rag-agent-lab) | Add cross-encoder reranking and index persistence; switch to English | 2026-08-18 |

<!-- pulse:end -->

<sub>`scripts/pulse.mjs` · eventos **públicos** (no filtra `renovo-core`) · sin widgets de terceros · sin tracking del lector.</sub>

## No está aquí

Notas de vida, fichas de locales, datos personales, tokens. Memoria = Obsidian. CRM = Notion. GitHub = código y skills, no un segundo cerebro.

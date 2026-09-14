MMConnect V180 — Release Candidate

index.html: painel RH/Admin.
colaborador.html: app móvel exclusivo do colaborador.

Para produção, publique por HTTPS (ex.: Cloudflare Pages). Não abra colaborador.html via file:// para o teste final.

Colaborador: Entrada, Pausa, Retorno, Saída, horas trabalhadas, horas extra, horas noturnas, atrasos, turno e picagens próprias.
RH/Admin: gestão da empresa.

Segurança: o frontend apenas apresenta a experiência; a autorização real depende do Supabase Auth + RLS/RPC.

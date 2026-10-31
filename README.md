# Prado Vision — Site & Hub 2.0

Nova versão do site institucional (visual clean, dourado suave, animações discretas e responsividade) e base operacional do **Prado Vision Hub** (área autenticada para administrador e clientes).

## Funcionalidades implementadas

- Site público: home, serviços, demonstrações conceituais de projetos, apresentação, metodologia, FAQ, contato WhatsApp, política de privacidade, sitemap e SEO básico.
- Portal `/painel`: sessão segura, separação de papéis, painel de indicadores, cadastro de clientes, criação e atualização de projetos, solicitações de atendimento, troca de senha e auditoria no banco.
- Cliente: autenticação individual, visualização somente de seus projetos/chamados, abertura de chamados.
- Administrador: cadastra clientes, emite senhas temporárias aleatórias, gerencia projetos e status de chamados.
- Segurança: cookies `HttpOnly`, `Secure` em produção, `SameSite=Strict`, token CSRF por sessão, sessões com hash no PostgreSQL, hash de senhas scrypt, validação e parametrização SQL, checagem de origem, rate limit básico, CSP restritiva, HSTS, headers antiframe e prevenção de acesso a arquivos de configuração.

**Atenção:** o site público é funcional mesmo sem PostgreSQL. O portal só funciona com DB e credenciais de bootstrap; sem isso, todas as rotas privadas ficam indisponíveis. Não existe senha padrão.

## Variáveis de ambiente (Railway)

1. Criar um projeto independente chamado Prado Vision, criar serviço Node a partir deste repositório e adicionar PostgreSQL no mesmo projeto.
2. No serviço web adicionar `DATABASE_URL` com **referência à variável privada** do PostgreSQL (`${{Postgres.DATABASE_URL}}`, adaptando o nome do serviço).
3. Adicionar `NODE_ENV=production`.
4. Para criar a primeira conta administrativa: `ADMIN_EMAIL` com e-mail corporativo e `ADMIN_BOOTSTRAP_PASSWORD` com senha forte de 16 caracteres ou mais. É criada **somente uma conta** na inicialização, caso ainda não exista qualquer administrador. **Apagar ADMIN_BOOTSTRAP_PASSWORD da configuração após confirmar a criação** e definir imediatamente a senha individual de uso.
5. Conectar `pradovision.com.br` e `www.pradovision.com.br` no domínio do serviço quando aprovado. Ajustar DNS conforme os valores gerados pelo Railway e proteger via Cloudflare WAF.
6. Ativar MFA nas contas GitHub, Railway, registrador e Cloudflare, configurar backups de PostgreSQL, alertas e monitoramento; revisar política LGPD antes de coletar dados reais.

## Desenvolvimento local

```bash
npm install
npm start
```

`http://localhost:3000` apresenta o site; `http://localhost:3000/painel` mostra a área de clientes; `/health` retorna saúde do servidor. Sem PostgreSQL, o portal exibe mensagem de configuração pendente.

## Segurança e limites

- O rate limit em memória cobre uma instância e **não substitui** rate limiting distribuído no WAF.
- O login atual utiliza senhas fortes, scrypt e sessão em Postgres; **MFA no portal ainda não implementado**. Recomenda-se MFA externo com Cloudflare Access ou evolução do módulo antes de operações sensíveis.
- A criação de clientes retorna senha temporária para o administrador copiar uma vez. Enviar por canal seguro e pedir alteração no primeiro acesso.
- Não há sistema de e-mail transacional, faturamento, contratos, integração de pagamentos, monitoramento de servidores de clientes ou notificações push implementados; estes são módulos futuros e exigem requisitos, integrações e testes específicos.
- Os mockups do portfólio são **conceituais**; não são capturas de clientes nem métricas reais.
- A segurança absoluta não é possível. Revisão de dependências, pentest, controle de acesso por camada e backups periódicos são necessários antes de uso operacional com dados importantes.
- Antes de ligar DNS de produção, confirmar eventual serviço de e-mail existente (MX, SPF, DKIM, DMARC) para não interromper mensagens corporativas.

## Preservação de versões

Publicar inicialmente por branch independente e domínio de homologação; não sobrescrever a branch principal até avaliação do visual e validação das funcionalidades. Não reutilizar banco dos projetos dos clientes.

# Prado Vision — Site Institucional + Prado Vision Hub (versão 3)

Identidade aprovada: **clean / off-white / dourado**, desenho editorial, animações discretas, navegação acessível, conteúdo que explica serviços, portfólio, processo, orçamento, FAQ e contato comercial. Base técnica preservada do Hub 2.0, com módulos de clientes, projetos, solicitações e autenticação individual.

## O que está implementado

### Site público
- Página inicial com 4 serviços e explicações detalhadas, 4 diferenciais, 2 demonstrações visuais de aplicações (ilustrativas, sem divulgar dados de clientes), 5 etapas do projeto, informações transparentes e 14 perguntas frequentes pesquisáveis.
- Formulário comercial que monta uma mensagem no navegador e abre WhatsApp (sem banco de dados ou envio a servidor Prado Vision). Verifique o número no arquivo `public/site.js` antes de publicar: foi mantido o WhatsApp comercial do site antigo, **(45) 99961-4886**, ainda não reconfirmado.
- Efeitos leves no mouse e na rolagem, reduzidos automaticamente com a preferência `prefers-reduced-motion`.
- SEO técnico básico, sitemap, robots e política de privacidade. Nenhum dado fictício de entregas, depoimentos ou avaliação é anunciado.
- **Marca oficial**: o servidor expõe a imagem original que já está no repositório principal (`img/logo_prado_vision.png`) no caminho interno `/marca-original`. O navegador retira o fundo preto da imagem *apenas para exibi-la* sobre fundo claro. A marca não é substituída por um símbolo inventado. Se copiar este projeto fora do repositório original, inclua o arquivo no caminho `img/logo_prado_vision.png`; sem ele, aparece um fallback tipográfico temporário.

### Prado Vision Hub
- Login com conta administrativa e contas de clientes; sessão armazenada no banco PostgreSQL; painel individual com projetos, etapas, progresso e solicitações; administração de clientes e chamados; mudança de senha e auditoria.
- A base funcional do Hub **não é um ERP completo**, sistema financeiro, emissão fiscal, contratos, monitoramento 24 h ou central de notificações. Esses serviços não estão implementados. Configurações e testes reais de banco de dados são obrigatórios antes de uso por clientes.

## Rodar localmente

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run check
npm test
npm start
```

- Site: `http://localhost:3000/`
- Portal: `http://localhost:3000/painel`
- Healthcheck: `http://localhost:3000/health`
- Sem PostgreSQL, o site funciona e o Hub recusa operações privadas (estado seguro; não há senha de demonstração).

## Publicação isolada de produção

1. **Preserve a branch atual de produção e os bancos existentes.** Crie novo projeto de hospedagem para Prado Vision e ambiente `staging`. Não misture projetos dos clientes da Prado Vision.
2. Inclua `img/logo_prado_vision.png` junto com o código (o arquivo já existe no repositório GitHub original). Verifique se o nome e as maiúsculas/minúsculas correspondem.
3. Para o site público, execute o serviço Node pelo comando `npm start` com `NODE_ENV=production` e `PORT` fornecida pelo provedor.
4. Para ativar o Hub, adicione PostgreSQL exclusivo, `DATABASE_URL` via referência privada de variável do provedor e **confirme backups restauráveis e política de retenção**.
5. Bootstrap do primeiro admin: configure `ADMIN_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD` forte (16+ caracteres) em variáveis privadas. A conta é criada somente se não existir administrador. Retire `ADMIN_BOOTSTRAP_PASSWORD` da infraestrutura imediatamente depois da criação. **Nunca insira a senha nos arquivos ou no GitHub.**
6. Antes da exposição pública do Hub, adote MFA em contas operacionais, WAF/limite de tentativas, TLS e validação independente de autenticação, permissões e segurança da aplicação. O **MFA interno do Hub não está implementado**; considere protegê-lo com controle de acesso adicional ou não habilitá-lo até a implementação e a homologação.
7. Após testes, conecte `pradovision.com.br`, `www.pradovision.com.br` e HTTPS. Configure DNS no registrador ou Cloudflare conforme o provedor. **Antes de trocar nameservers, confira os registros MX/SPF/DKIM/DMARC** para preservar e-mail.
8. Valide TLS/certificado, cabeçalhos CSP/HSTS (HSTS só habilitado na aplicação com `NODE_ENV=production`), WAF, rate limit distribuído, monitoramento/alertas, LGPD, performance, responsividade, backups e procedimentos de recuperação.

## Limites de segurança

- Nenhum site conectado à internet é totalmente invulnerável. A proteção exige operação contínua.
- Medidas atuais incluem CSP, cabeçalhos anti-frame, `nosniff`, query parametrizada, cookies `HttpOnly` e `SameSite=Strict`, hash `scrypt`, token CSRF, checagem de origem e rate limit local em memória.
- O limitador local não substitui rate limiting distribuído e proteção de borda. Quando usar múltiplas instâncias, centralize essas medidas na infraestrutura.
- O portal ainda não tem MFA interno, recuperação de senha self-service, alertas por e-mail, autorização granular por projeto para administradores, nem testes de invasão independentes. Por isso não declare o sistema pronto para dados críticos até homologação.
- `ADMIN_BOOTSTRAP_PASSWORD` nunca deve ser exposta publicamente nem compartilhada em conversas.

## Testes e validação

`npm test` executa testes de rotas públicas, proteção de caminhos e arquivos internos, verificação de origem, estado seguro sem banco, hash de senhas e existência de serviços, privacidade e FAQ. `npm run check` verifica sintaxe dos scripts. **Testes com PostgreSQL real, navegador visual, acessibilidade, segurança dinâmica e domínio público ainda precisam ser feitos no ambiente de homologação.**

## Alterações e autoria

Código e conteúdo do projeto institucional foram desenvolvidos para a Prado Vision. As telas de sistemas no portfólio são **ilustrações de possibilidades**, não fotografias de clientes ou resultados comerciais medidos. Cases identificados, nomes, logotipos e avaliações só devem aparecer com autorização.
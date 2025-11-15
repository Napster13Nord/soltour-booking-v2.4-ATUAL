OBJETIVO DO PLUGIN

O plugin NÃO FARÁ RESERVAS diretas.
O objetivo é:

Permitir que o visitante busque pacotes (Availability).

Exibir os pacotes, incluindo hotel, voos, preços, fotos e detalhes.

Permitir que o visitante gere uma Cotação Oficial via /booking/quote.

Enviar essa cotação para a agência via e-mail.

(Opcional) Criar um Expediente Oficial via /booking/generateExpedient para que a agência continue o processo.

A reserva final será feita pela agência, fora do site.

🔷 PARTE 1 — O QUE JÁ ESTÁ FUNCIONANDO
✔️ 1.1 Busca de pacotes (/booking/availability)

O plugin já:

recebe parâmetros de busca (datas, origem–destino, passageiros, quartos);

faz a chamada ao endpoint availability;

lista os pacotes com paginação;

traz os budgets corretos.

Tudo funcionando.

✔️ 1.2 Exibição de detalhes do hotel (/booking/details)

Fotos, descrição longa, categoria, localização.

Endpoint correto e funcional.

✔️ 1.3 Página de Cotação (frontend)

Carrega dados do pacote selecionado pelo usuário.

Preenche formulário com dados de contato e passageiros.

Envia via AJAX para o backend.

✔️ 1.4 Envio de email interno (WordPress)

O plugin já monta a cotação e envia para a BeautyTravel.

Email HTML está funcional.

✔️ 1.5 Geração de Expediente (/booking/generateExpedient)

Endpoint já está implementado no backend.

Apenas falta conectar ao fluxo da cotação.

🔷 PARTE 2 — O QUE AINDA NÃO ESTÁ CORRETO
❌ 2.1 O plugin NÃO usa /booking/quote

Atualmente, a cotação é feita localmente, usando o budget retornado pelo availability.
Isso É INCORRETO, porque:

O availability não é o preço final.

O quote recalcula tarifas com yield pricing.

Penalizações, seguros, extras e informações legais só aparecem no quote.

✔ Precisamos chamar /booking/quote no backend ao gerar a cotação.

❌ 2.2 Dados do quote não aparecem no frontend

Hoje:

A página de cotação exibe apenas dados do budget do availability.

Não exibe seguros, extras, nem textos legais.

Não mostra penalizações atualizadas.

✔ Precisamos renderizar o resultado do quote na página.

❌ 2.3 O fluxo de “cotação + expediente” não está ligado

Hoje não existe:

botão para gerar expediente após a cotação,

envio do expediente para o email,

visualização do expediente na tela.

✔ Precisamos completar essa etapa opcional.

❌ 2.4 BOOK NÃO DEVE SER USADO

O plugin possui código para:

validate booking,

book package,

cancel booking,

etc.

✔ NADA disso será usado agora.
✔ Manter o código é opcional, mas essas funções devem ficar inativas.

🔷 PARTE 3 — ENDPOINTS QUE DEVEM SER USADOS
✔ 3.1 /booking/availability

Já implementado e funcionando.

Retorna:

lista de budgets,

hotelServices,

flightServices,

transferServices,

cancellationChargeServices,

priceBreakdown.

✔ 3.2 /booking/details

Já implementado.

Retorna descrição completa de hotel.

✔ 3.3 /booking/quote (PRIORITÁRIO)

Esse endpoint recalcula a cotação final, corrigindo:

preços,

penalizações por serviço,

availability final,

extras,

seguros (insurances[]),

informações importantes (importantInformation[]),

breakdown final.

REQUEST:
{
  "productType": "PACKAGE",
  "availToken": "...",
  "budgetIds": ["..."]
}

RESPONSE:
{
  "budget": { ... },           // Preço final
  "insurances": [...],         // Seguros oficiais
  "extras": [...],             // Extras adicionais
  "importantInformation": [...], // Textos para voucher
  "requestParams": {...}
}

✔ 3.4 /booking/generateExpedient

Para criar expediente oficial.

REQUEST:
{
  "destination": "PUJ",
  "productType": "PACKAGE",
  "availToken": "...",
  "bookingHolder": {
    "email": "cliente@exemplo.com",
    "firstName": "Nome",
    "lastName1": "Sobrenome",
    "lastName2": ""
  },
  "startDate": "2025-11-15",
  "agencyBookingReference": "BT-123456"
}

RESPONSE:
{
  "expedient": "EX123456789",
  ...
}

🔷 PARTE 4 — COMO O FLUXO FINAL DEVE FUNCIONAR
🟦 ETAPA 1 — Usuário busca pacotes

Endpoint: availability

✔ Já funcionando.

🟦 ETAPA 2 — Usuário vê detalhes do hotel

Endpoint: details

✔ Já funcionando.

🟦 ETAPA 3 — Usuário clica em "Gerar Cotação"

O frontend envia:

availToken

budgetId

dados do passageiro

email, telefone, notas

🟦 ETAPA 4 — Backend chama /booking/quote (ATUALIZAÇÃO NECESSÁRIA)
NOVO fluxo:
$quote_response = $api->quote_package($availToken, $budgetId);


Validar:

if (empty($quote_response['budget'])) {
    error: falhou quote
}


Se OK:

juntar quote_response + dados do usuário

salvar (opcional)

enviar email para a agência

🟦 ETAPA 5 — Exibir o resultado do quote para o usuário

O front deve renderizar:

budget.priceBreakdown

budget.hotelServices

budget.flightServices

budget.cancellationChargeServices

insurances[]

importantInformation[]

Idealmente, tudo igual ao site oficial.

🟦 ETAPA 6 — (Opcional) Criar Expediente

Se a BeautyTravel quiser:

Criar um botão:

"Gerar Expediente para a Agência"

Chamar via AJAX:

soltour_generate_expedient


Que chama:

$api->generate_expedient($params);


Responder para o usuário:

Expediente gerado: EX123456789


E enviar também no e-mail interno.

🔷 PARTE 5 — PONTOS IMPORTANTES PRO DESENVOLVEDOR
✔ 5.1 O quote NÃO faz pré-reserva

Ele NÃO bloqueia voo/hotel.

Somente o endpoint /booking/book faria isso (NÃO vamos usar).

✔ 5.2 Usar sempre o preço do quote

Nunca usar:

preço do availability

penalizações do availability

Somente usar:

budget.priceBreakdown

budget.cancellationChargeServices

Do resultado oficial do quote.

✔ 5.3 Salvar cotação é opcional

Mas recomendado: salvar no WordPress (custom post_type soltour_quote):

budgetId

availToken

quote completo (JSON)

dados do cliente

expediente (se houver)

✔ 5.4 Não misturar BOOK com Cotação

Desativar/ocultar no front:

reserve now

validate booking

book package

Para evitar confusão.

✔ 5.5 Testes necessários
1. Testar availability com paginação

✔ Já OK.

2. Testar quote real com budget

Deve retornar:

priceBreakdown final

insurances

extras

importantInformation

3. Testar generateExpedient

Validar:

email no holder

destination correto

agency reference

🔷 PARTE 6 — Próximos passos (prioridade)
PRIORIDADE 1 — Implementar /booking/quote na geração de cotação

(PARTE MAIS IMPORTANTE)

PRIORIDADE 2 — Renderizar dados do quote no frontend

(preço final, penalizações, informações importantes)

PRIORIDADE 3 — Integração opcional do expediente

(botão "Gerar expediente")

PRIORIDADE 4 — Testar tudo com dados reais e Postman
🔷 PARTE 7 — Código de referência para implementar
Back-end (PHP)
Função ajax_generate_quote corrigida
function ajax_generate_quote() {
    check_ajax_referer('soltour_booking_nonce', 'nonce');

    $budget_data = json_decode(stripslashes($_POST['budget_data']), true);
    $passengers  = json_decode(stripslashes($_POST['passengers']), true);
    $notes       = sanitize_textarea_field($_POST['notes']);

    $api = Soltour_API::get_instance();

    // 1) Quote oficial
    $quote = $api->quote_package(
        $budget_data['availToken'],
        $budget_data['budgetId']
    );

    if (empty($quote['budget'])) {
        wp_send_json_error([
            'message' => 'Erro ao obter cotação oficial da Soltour',
            'response' => $quote
        ]);
    }

    // 2) Montar cotação final
    $final_quote = [
        'quote' => $quote,
        'passengers' => $passengers,
        'notes' => $notes
    ];

    // (Opcional) salvar no WP aqui

    // 3) Responder
    wp_send_json_success([
        'message' => 'Cotação oficial gerada com sucesso!',
        'data' => $final_quote
    ]);
}

🔷 PARTE 8 — Resultado final esperado

Após implementar tudo:

🟢 Usuário busca pacotes → OK
🟢 Vê detalhes → OK
🟢 Gera cotação oficial → /booking/quote
🟢 Vê valores finais, penalizações, informações
🟢 Agência recebe email com cotação oficial
🟢 (Opcional) Expediente criado

E nenhuma reserva é feita automaticamente.
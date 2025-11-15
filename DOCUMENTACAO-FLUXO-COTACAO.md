# 📄 DOCUMENTAÇÃO COMPLETA – Implementação Final do Fluxo de Cotação

**Beauty Travel — Plugin Soltour**
**Versão:** Final
**Autor:** André
**Última Atualização:** 15/11/2025

---

## 🎯 Objetivo Geral

Ao clicar no botão **"Gerar Cotação Final"**, o sistema deve:

### Front-end
1. Validar o formulário
2. Enviar todos os dados ao backend via AJAX
3. Redirecionar para a página de confirmação

### Backend
1. Registrar a cotação no WordPress (CPT "Cotações Beauty Travel")
2. Enviar email interno para a agência (Google Workspace via SMTP)
3. Enviar email ao cliente com resumo e próximos passos
4. Retornar URL de redirecionamento ao JS

---

## 🧭 1. Fluxo Geral

1. Usuário preenche **Dados dos Passageiros**
2. Marca o checkbox dos **Termos & Condições**
3. Clica em **Gerar Cotação Final**
4. JS chama `submitFinalQuote()` ⇒ envia dados via AJAX
5. PHP (ação `soltour_save_final_quote`) recebe, sanitiza e processa:
   - Salva cotação no WordPress
   - Envia emails (interno + cliente)
   - Responde com `redirect_url`
6. JS redireciona o usuário para a página "cotação-confirmada"

---

## 🎨 2. Interface da Página de Cotação

### 2.1. Estrutura da Página (Desktop)

```html
<div class="bt-quote-page">
    <!-- Header -->
    <div class="bt-quote-header">
        <h1>Cotação do Seu Pacote</h1>
        <p>Preencha os dados abaixo para receber sua cotação personalizada</p>
    </div>

    <!-- Grid Layout (2 colunas em desktop) -->
    <div class="bt-quote-grid">
        <!-- COLUNA ESQUERDA (70%) -->
        <div class="bt-quote-left-column">
            <!-- Resumo do Pacote -->
            <div class="bt-package-summary">
                <h2>Resumo do Pacote</h2>
                <!-- Hotel, Quartos, Voos, Datas, Transfers -->
            </div>

            <!-- Dados dos Passageiros -->
            <div class="bt-passengers-form">
                <h2>Dados dos Passageiros</h2>
                <!-- Formulários de passageiros -->
            </div>

            <!-- Custos de Cancelamento (se disponível) -->
            <div class="bt-package-summary">
                <h2>Custos de Cancelamento</h2>
                <!-- Card expansível com tabelas de custos -->
            </div>

            <!-- Informações Importantes (se disponível) -->
            <div class="bt-package-summary">
                <h2>Informações Importantes e Condições</h2>
                <!-- Accordion com textos legais -->
            </div>

            <!-- Serviços Extras (se disponível) -->
            <div class="bt-package-summary">
                <h2>Serviços Extras</h2>
                <!-- Grid com extras selecionáveis -->
            </div>
        </div>

        <!-- COLUNA DIREITA (30%) - SIDEBAR -->
        <div class="bt-price-sidebar">
            <h2>Preço Final da Viagem</h2>

            <!-- Detalhes da Viagem -->
            <div class="bt-sidebar-section">
                <h3 class="bt-sidebar-title">ℹ️ Detalhes da Viagem</h3>
                <!-- Check-in, Check-out, Noites, Regime, Passageiros -->
            </div>

            <!-- Seguros Disponíveis (se disponível) -->
            <div class="bt-sidebar-section">
                <!-- Card expansível de seguros -->
            </div>

            <!-- Preço Total -->
            <div class="bt-sidebar-section bt-sidebar-price">
                <div class="bt-price-total">
                    <div class="bt-price-total-label">Preço Total</div>
                    <div class="bt-price-total-amount">1500€</div>
                    <div class="bt-price-per-person">(750€ por pessoa)</div>
                </div>
            </div>

            <!-- GDPR Consent -->
            <div class="bt-gdpr-consent">
                <label class="bt-gdpr-label">
                    <input type="checkbox" id="gdpr-consent" required />
                    <span class="bt-gdpr-text">
                        Ao gerar a cotação, concordo com os
                        <a href="/termos-e-condicoes">Termos e Condições</a>
                        e <a href="/politica-de-privacidade">Política de Privacidade</a>
                    </span>
                </label>
            </div>

            <!-- Botão de Gerar Cotação -->
            <button type="button" class="bt-btn-generate-quote" id="btn-generate-quote" disabled>
                <i class="fas fa-file-invoice"></i>
                Gerar Cotação Final
            </button>
        </div>
    </div>
</div>
```

### 2.2. Responsividade Mobile (< 992px)

Em telas menores que **992px**, o layout muda completamente:

#### Layout Mobile:
```css
/* Grid vira Flexbox em coluna */
@media (max-width: 992px) {
    .bt-quote-grid {
        display: flex !important;
        flex-direction: column !important;
    }

    /* Ordem dos elementos */
    .bt-quote-left-column {
        order: 1 !important;  /* Conteúdo aparece PRIMEIRO */
    }

    .bt-price-sidebar {
        order: 2 !important;  /* Sidebar aparece POR ÚLTIMO */
        position: static !important;  /* Remove sticky */
    }
}
```

#### Ordem Mobile:
1. ✅ Resumo do Pacote
2. ✅ Dados dos Passageiros
3. ✅ Custos de Cancelamento
4. ✅ Informações Importantes
5. ✅ Serviços Extras
6. ✅ **Sidebar (Preço + Botão) ← ÚLTIMO**

#### Ajustes de Padding Mobile:
- Container principal: `15px`
- Cards: `12-15px`
- Títulos H2: `17px`
- Border-radius: `6-8px`

---

## 🧩 3. Front-end – Implementação JavaScript

### 3.1. Listener do botão

```javascript
jQuery(document).ready(function($) {
    // Habilitar/desabilitar botão baseado no checkbox GDPR
    $('#gdpr-consent').on('change', function() {
        $('#btn-generate-quote').prop('disabled', !$(this).is(':checked'));
    });

    // Click no botão de gerar cotação
    $('#btn-generate-quote').on('click', function(e) {
        e.preventDefault();
        generateFinalQuote();
    });
});
```

### 3.2. Função `generateFinalQuote()`

```javascript
function generateFinalQuote() {
    // 1. VALIDAR FORMULÁRIO
    const formData = collectFormData();

    if (!formData) {
        alert('⚠️ Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    // 2. DESABILITAR BOTÃO
    const $btn = $('#btn-generate-quote');
    $btn.prop('disabled', true)
        .html('<i class="fas fa-spinner fa-spin"></i> Gerando cotação...');

    // 3. PREPARAR DADOS
    const payload = {
        cliente: {
            nome: formData.passengers[0].firstName,
            apelido: formData.passengers[0].lastName,
            email: formData.passengers[0].email,
            telefone: formData.passengers[0].phone
        },
        passageiros: formData.passengers.map(p => ({
            tipo: p.type,
            nome: p.firstName,
            apelido: p.lastName,
            data_nascimento: p.birthDate,
            documento: p.document
        })),
        viagem: {
            hotelName: BeautyTravelQuote.packageData.hotelInfo?.name || 'Hotel',
            hotelCode: BeautyTravelQuote.packageData.budget?.hotelServices?.[0]?.hotelCode || '',
            destino: BeautyTravelQuote.packageData.hotelInfo?.destinationDescription || '',
            checkin: BeautyTravelQuote.packageData.budget?.hotelServices?.[0]?.checkIn || '',
            checkout: BeautyTravelQuote.packageData.budget?.hotelServices?.[0]?.checkOut || '',
            noites: BeautyTravelQuote.packageData.budget?.hotelServices?.[0]?.nights || 0,
            regime: getMealPlan(BeautyTravelQuote.packageData.budget),
            quarto: BeautyTravelQuote.packageData.selectedRoom?.description || '',
            num_passageiros: formData.passengers.length,
            preco_total: extractPrice(BeautyTravelQuote.packageData.budget),
            preco_pessoa: extractPrice(BeautyTravelQuote.packageData.budget) / formData.passengers.length,
            seguro: getSelectedInsurance(),
            budget_id: BeautyTravelQuote.packageData.budget?.id || '',
            quote_token: BeautyTravelQuote.packageData.quoteToken || '',
            avail_token: BeautyTravelQuote.packageData.availToken || ''
        }
    };

    // 4. ENVIAR VIA AJAX
    jQuery.ajax({
        url: soltourData.ajaxurl,
        type: 'POST',
        dataType: 'json',
        data: {
            action: 'soltour_save_final_quote',
            nonce: soltourData.nonce,
            quote_data: JSON.stringify(payload)
        },
        success: function(response) {
            if (response.success) {
                // Redirecionar para página de confirmação
                window.location.href = response.data.redirect_url;
            } else {
                alert('❌ Erro ao gerar cotação: ' + (response.data?.message || 'Erro desconhecido'));
                $btn.prop('disabled', false)
                    .html('<i class="fas fa-file-invoice"></i> Gerar Cotação Final');
            }
        },
        error: function(xhr, status, error) {
            alert('❌ Erro de conexão. Por favor, tente novamente.');
            $btn.prop('disabled', false)
                .html('<i class="fas fa-file-invoice"></i> Gerar Cotação Final');
        }
    });
}
```

### 3.3. Função auxiliar `collectFormData()`

```javascript
function collectFormData() {
    const passengers = [];

    $('.bt-form-section').each(function() {
        const $section = $(this);
        const title = $section.find('h3').text();

        const firstName = $section.find('input[name*="firstname"]').val()?.trim();
        const lastName = $section.find('input[name*="lastname"]').val()?.trim();
        const birthDate = $section.find('input[name*="birthdate"]').val();
        const document = $section.find('input[name*="document"]').val()?.trim();
        const email = $section.find('input[name*="email"]').val()?.trim();
        const phone = $section.find('input[name*="phone"]').val()?.trim();

        // Validar campos obrigatórios
        if (!firstName || !lastName || !birthDate || !document) {
            return false;
        }

        passengers.push({
            type: title.includes('Adulto') ? 'adult' : 'child',
            firstName: firstName,
            lastName: lastName,
            birthDate: birthDate,
            document: document,
            email: email || null,
            phone: phone || null,
            isMainPassenger: email ? true : false
        });
    });

    if (passengers.length === 0 || passengers.some(p => !p.firstName)) {
        return null;
    }

    return { passengers: passengers };
}
```

---

## 🛠️ 4. Backend – WordPress AJAX

### 4.1. Registrar handlers

```php
// No arquivo principal do plugin
add_action('wp_ajax_soltour_save_final_quote', 'soltour_save_final_quote');
add_action('wp_ajax_nopriv_soltour_save_final_quote', 'soltour_save_final_quote');
```

### 4.2. Registrar Custom Post Type

```php
function beautytravel_register_quote_cpt() {
    register_post_type('beautytravel_quote', [
        'labels' => [
            'name'          => 'Cotações Beauty Travel',
            'singular_name' => 'Cotação',
            'add_new'       => 'Adicionar Nova',
            'add_new_item'  => 'Adicionar Nova Cotação',
            'edit_item'     => 'Editar Cotação',
            'all_items'     => 'Todas as Cotações',
        ],
        'public'              => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'menu_icon'           => 'dashicons-tickets',
        'supports'            => ['title'],
        'capability_type'     => 'post',
        'has_archive'         => false,
        'hierarchical'        => false,
        'menu_position'       => 26,
    ]);
}
add_action('init', 'beautytravel_register_quote_cpt');
```

### 4.3. Função `soltour_save_final_quote`

```php
function soltour_save_final_quote() {
    // PASSO A — Validar nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'soltour_booking_nonce')) {
        wp_send_json_error(['message' => 'Nonce inválido.']);
    }

    // PASSO B — Decodificar JSON
    if (!isset($_POST['quote_data'])) {
        wp_send_json_error(['message' => 'Dados ausentes.']);
    }

    $data = json_decode(wp_unslash($_POST['quote_data']), true);

    if (!is_array($data)) {
        wp_send_json_error(['message' => 'Dados inválidos.']);
    }

    // PASSO C — Validar dados obrigatórios
    if (
        empty($data['cliente']['nome']) ||
        empty($data['cliente']['email']) ||
        empty($data['passageiros']) ||
        empty($data['viagem']['hotelName'])
    ) {
        wp_send_json_error(['message' => 'Dados obrigatórios ausentes.']);
    }

    // PASSO D — Criar cotação no WordPress
    $post_title = sprintf(
        'Cotação - %s %s - %s',
        sanitize_text_field($data['cliente']['nome']),
        sanitize_text_field($data['cliente']['apelido']),
        sanitize_text_field($data['viagem']['hotelName'])
    );

    $post_id = wp_insert_post([
        'post_type'   => 'beautytravel_quote',
        'post_status' => 'publish',
        'post_title'  => $post_title,
    ]);

    if (is_wp_error($post_id)) {
        wp_send_json_error(['message' => 'Erro ao salvar cotação.']);
    }

    // Salvar todos os dados como meta
    update_post_meta($post_id, '_bt_quote_data', $data);
    update_post_meta($post_id, '_bt_cliente_email', sanitize_email($data['cliente']['email']));
    update_post_meta($post_id, '_bt_cliente_nome', sanitize_text_field($data['cliente']['nome']));
    update_post_meta($post_id, '_bt_hotel_name', sanitize_text_field($data['viagem']['hotelName']));
    update_post_meta($post_id, '_bt_preco_total', floatval($data['viagem']['preco_total']));
    update_post_meta($post_id, '_bt_data_criacao', current_time('Y-m-d H:i:s'));

    // PASSO E — Enviar emails
    beautytravel_send_internal_email($data, $post_id);
    beautytravel_send_client_email($data);

    // PASSO F — Retornar URL de redirecionamento
    $redirect_page = get_page_by_path('cotacao-confirmada');
    $redirect_url = $redirect_page ? get_permalink($redirect_page) : home_url('/');

    wp_send_json_success([
        'redirect_url' => $redirect_url,
        'quote_id'     => $post_id
    ]);
}
```

---

## 📧 5. Envio de Emails (Google Workspace via SMTP)

### ⚠️ IMPORTANTE:
- **NÃO enviar SMTP manualmente**
- Usar apenas `wp_mail()`
- Plugin SMTP já está configurado com Google Workspace
- Emails serão enviados automaticamente por `reservas@beautytravel.pt`

### 5.1. Email Interno (para a agência)

```php
function beautytravel_send_internal_email($data, $quote_id) {
    $to      = 'andre@wpexperts.pt';
    $subject = sprintf(
        'Nova cotação Beauty Travel #%d - %s',
        $quote_id,
        $data['viagem']['hotelName']
    );

    // Montar corpo do email
    ob_start();
    ?>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #019CB8;">Nova Cotação Recebida</h2>

        <h3>📋 Dados do Cliente</h3>
        <p>
            <strong>Nome:</strong> <?php echo esc_html($data['cliente']['nome'] . ' ' . $data['cliente']['apelido']); ?><br>
            <strong>Email:</strong> <a href="mailto:<?php echo esc_attr($data['cliente']['email']); ?>"><?php echo esc_html($data['cliente']['email']); ?></a><br>
            <strong>Telefone:</strong> <?php echo esc_html($data['cliente']['telefone']); ?>
        </p>

        <h3>🏨 Dados da Viagem</h3>
        <p>
            <strong>Hotel:</strong> <?php echo esc_html($data['viagem']['hotelName']); ?><br>
            <strong>Destino:</strong> <?php echo esc_html($data['viagem']['destino']); ?><br>
            <strong>Check-in:</strong> <?php echo esc_html(date('d/m/Y', strtotime($data['viagem']['checkin']))); ?><br>
            <strong>Check-out:</strong> <?php echo esc_html(date('d/m/Y', strtotime($data['viagem']['checkout']))); ?><br>
            <strong>Noites:</strong> <?php echo esc_html($data['viagem']['noites']); ?><br>
            <strong>Regime:</strong> <?php echo esc_html($data['viagem']['regime']); ?><br>
            <strong>Quarto:</strong> <?php echo esc_html($data['viagem']['quarto']); ?>
        </p>

        <h3>👥 Passageiros (<?php echo count($data['passageiros']); ?>)</h3>
        <ul>
            <?php foreach ($data['passageiros'] as $pax): ?>
                <li>
                    <?php echo esc_html($pax['nome'] . ' ' . $pax['apelido']); ?>
                    (<?php echo $pax['tipo'] === 'adult' ? 'Adulto' : 'Criança'; ?> -
                    <?php echo esc_html(date('d/m/Y', strtotime($pax['data_nascimento']))); ?>)
                </li>
            <?php endforeach; ?>
        </ul>

        <h3>💰 Preço</h3>
        <p style="font-size: 20px; color: #019CB8;">
            <strong>Total:</strong> <?php echo number_format($data['viagem']['preco_total'], 2, ',', '.'); ?>€<br>
            <strong>Por pessoa:</strong> <?php echo number_format($data['viagem']['preco_pessoa'], 2, ',', '.'); ?>€
        </p>

        <p style="margin-top: 30px;">
            <a href="<?php echo admin_url('post.php?post=' . $quote_id . '&action=edit'); ?>"
               style="background: #019CB8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                Ver Cotação no WordPress
            </a>
        </p>
    </div>
    <?php
    $body = ob_get_clean();

    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: Beauty Travel <reservas@beautytravel.pt>',
        'Reply-To: ' . $data['cliente']['email']
    ];

    wp_mail($to, $subject, $body, $headers);
}
```

### 5.2. Email para o Cliente

```php
function beautytravel_send_client_email($data) {
    $to      = $data['cliente']['email'];
    $subject = 'Recebemos a sua cotação – Beauty Travel';

    ob_start();
    ?>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #019CB8 0%, #0176a8 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0;">Beauty Travel</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">A sua agência de viagens de confiança</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
            <p>Olá <strong><?php echo esc_html($data['cliente']['nome']); ?></strong>,</p>

            <p>Recebemos a sua solicitação de cotação para:</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #019CB8; margin-top: 0;">
                    🏨 <?php echo esc_html($data['viagem']['hotelName']); ?>
                </h3>
                <p>
                    📍 <?php echo esc_html($data['viagem']['destino']); ?><br>
                    📅 <?php echo esc_html(date('d/m/Y', strtotime($data['viagem']['checkin']))); ?>
                    a <?php echo esc_html(date('d/m/Y', strtotime($data['viagem']['checkout']))); ?><br>
                    🌙 <?php echo esc_html($data['viagem']['noites']); ?> noite(s)<br>
                    👥 <?php echo count($data['passageiros']); ?> passageiro(s)
                </p>
            </div>

            <p><strong>Próximos passos:</strong></p>
            <ol>
                <li>A nossa equipa vai validar os valores finais</li>
                <li>Entraremos em contacto consigo nas próximas 24 horas</li>
                <li>Após confirmação, enviaremos os dados de pagamento</li>
            </ol>

            <p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
                <strong>⚠️ Importante:</strong> Este email não constitui reserva confirmada.
                Aguarde o nosso contacto para confirmação final dos valores.
            </p>

            <p>Se tiver alguma dúvida, pode responder a este email ou contactar-nos através de:</p>
            <p>
                📧 <a href="mailto:reservas@beautytravel.pt">reservas@beautytravel.pt</a><br>
                📞 +351 XXX XXX XXX
            </p>

            <p style="margin-top: 30px;">
                Obrigado por escolher a Beauty Travel 💙
            </p>
        </div>

        <div style="background: #1a202c; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© <?php echo date('Y'); ?> Beauty Travel. Todos os direitos reservados.</p>
        </div>
    </div>
    <?php
    $body = ob_get_clean();

    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: Beauty Travel <reservas@beautytravel.pt>',
        'Reply-To: Beauty Travel <reservas@beautytravel.pt>'
    ];

    wp_mail($to, $subject, $body, $headers);
}
```

---

## 🎯 6. Página de Confirmação

### 6.1. Criar página no WordPress

- **Slug:** `cotacao-confirmada`
- **Título:** Cotação Enviada com Sucesso
- **Template:** Página padrão

### 6.2. Conteúdo sugerido

```html
<div style="max-width: 800px; margin: 60px auto; padding: 40px; text-align: center;">
    <div style="font-size: 80px; margin-bottom: 20px;">✅</div>

    <h1 style="color: #019CB8; margin-bottom: 20px;">
        Cotação enviada com sucesso!
    </h1>

    <p style="font-size: 18px; color: #4b5563; margin-bottom: 30px;">
        Obrigado pela sua solicitação.<br>
        A equipa Beauty Travel vai analisar sua cotação e entrará em contacto
        o mais rápido possível.
    </p>

    <div style="background: #f0f8ff; border-left: 4px solid #019CB8; padding: 20px; margin: 30px 0; text-align: left;">
        <h3 style="margin-top: 0; color: #019CB8;">📧 Próximos passos</h3>
        <ol style="margin: 0; padding-left: 20px;">
            <li>Verifique o seu email (incluindo spam)</li>
            <li>Aguarde o nosso contacto em até 24 horas</li>
            <li>Mantenha os seus dados de contacto disponíveis</li>
        </ol>
    </div>

    <p style="margin-top: 40px;">
        <a href="/" style="background: #019CB8; color: white; padding: 15px 40px;
                          text-decoration: none; border-radius: 8px; display: inline-block;">
            Voltar à página inicial
        </a>
    </p>
</div>
```

---

## 📝 7. Checklist de Implementação

### ✅ Front-end
- [x] Estrutura HTML da página de cotação
- [x] Layout responsivo (desktop + mobile)
- [x] Formulário de passageiros
- [x] Validação de campos obrigatórios
- [x] Checkbox GDPR + habilitar/desabilitar botão
- [x] Função `generateFinalQuote()`
- [x] Função `collectFormData()`
- [x] Integração AJAX com backend
- [x] Tratamento de erros
- [x] Redirecionamento após sucesso

### ✅ CSS / Responsividade
- [x] Layout 2 colunas (70% / 30%) em desktop
- [x] Layout 1 coluna em mobile (< 992px)
- [x] `display: flex` + `flex-direction: column` no mobile
- [x] Order: conteúdo primeiro, sidebar por último
- [x] `position: static` na sidebar em mobile
- [x] Padding adequado (15px em mobile)
- [x] Nenhum card cortado nas laterais
- [x] 100% width em todos os elementos responsivos

### ✅ Backend
- [ ] CPT "Cotações Beauty Travel" registrado
- [ ] Ação AJAX `soltour_save_final_quote`
- [ ] Validação de nonce
- [ ] Validação de dados obrigatórios
- [ ] Salvar cotação como post
- [ ] Salvar metadados (`_bt_quote_data`, etc)
- [ ] Função `beautytravel_send_internal_email()`
- [ ] Função `beautytravel_send_client_email()`
- [ ] Retornar `redirect_url` no response

### ✅ Emails / SMTP
- [ ] Plugin SMTP configurado (Google Workspace)
- [ ] Email interno formatado (HTML)
- [ ] Email cliente formatado (HTML)
- [ ] "From" = `reservas@beautytravel.pt`
- [ ] Headers corretos (Content-Type, Reply-To)
- [ ] Testar recebimento dos emails

### ✅ Página de Confirmação
- [ ] Página criada com slug `cotacao-confirmada`
- [ ] Conteúdo de sucesso exibido
- [ ] Link para voltar à página inicial

---

## 🔧 8. Troubleshooting Comum

### Problema: Botão não habilita ao marcar checkbox
**Solução:** Verificar se o ID do checkbox é `gdpr-consent` e o evento `change` está registrado.

### Problema: AJAX retorna erro 400
**Solução:** Verificar se o nonce está correto e se a action está registrada no backend.

### Problema: Emails não chegam
**Solução:**
1. Verificar plugin SMTP ativo
2. Testar envio manual com `wp_mail()`
3. Verificar logs do servidor
4. Confirmar que `reservas@beautytravel.pt` está configurado

### Problema: Cards cortados no mobile
**Solução:** Verificar se `max-width: 992px` está ativo e `display: flex` está aplicado.

### Problema: Sidebar aparece primeiro no mobile
**Solução:** Verificar se `.bt-quote-left-column` tem `order: 1` e `.bt-price-sidebar` tem `order: 2`.

---

## 📞 9. Suporte e Contato

- **Desenvolvedor:** André
- **Email:** andre@wpexperts.pt
- **Agência:** Beauty Travel
- **Versão Plugin:** Soltour v2.4

---

## 📚 10. Referências

- [WordPress AJAX Documentation](https://developer.wordpress.org/plugins/javascript/ajax/)
- [wp_mail() Function Reference](https://developer.wordpress.org/reference/functions/wp_mail/)
- [Custom Post Types](https://developer.wordpress.org/plugins/post-types/registering-custom-post-types/)
- [Flexbox CSS Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

---

**Fim da documentação** ✅

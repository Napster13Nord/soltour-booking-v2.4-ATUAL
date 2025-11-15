# Configuração de Email - Plugin Soltour Booking V4

## Visão Geral

O plugin Soltour Booking V4 possui um sistema completo de envio de emails para notificar tanto a agência quanto os clientes sobre cotações geradas.

## Configurações de Email

### Emails Padrão

Por padrão, o plugin está configurado com os seguintes emails:

- **FROM (Remetente)**: `geral@beautytravel.pt`
- **FROM NAME (Nome do Remetente)**: `Beauty Travel`
- **REPLY-TO (Responder Para)**: `reservas@beautytravel.pt`

### Como Personalizar

Para personalizar as configurações de email, adicione as seguintes constantes no arquivo `wp-config.php`:

```php
// Configurações de Email do Plugin Soltour
define('SOLTOUR_EMAIL_FROM', 'seu-email@dominio.com');
define('SOLTOUR_EMAIL_FROM_NAME', 'Sua Empresa');
define('SOLTOUR_EMAIL_REPLY_TO', 'responder@dominio.com');
```

## Fluxo de Emails

Quando um cliente gera uma cotação, o sistema envia automaticamente **dois emails**:

### 1. Email para a Agência

- **Destinatário**: Email configurado em `SOLTOUR_EMAIL_REPLY_TO` (padrão: reservas@beautytravel.pt)
- **Assunto**: "Nova Cotação Recebida - [Nome do Hotel] ([Data])"
- **Conteúdo**:
  - Dados completos do cliente (nome, email, telefone)
  - Detalhes da viagem (hotel, destino, datas, regime)
  - Lista completa de passageiros
  - Observações do cliente
  - Valor total estimado
  - Link para visualizar no WordPress

### 2. Email para o Cliente

- **Destinatário**: Email do cliente que fez a cotação
- **Assunto**: "Recebemos a sua cotação – Beauty Travel"
- **Conteúdo**:
  - Confirmação de recebimento da cotação
  - Resumo da viagem solicitada
  - Próximos passos do processo
  - Informações de contato da agência
  - Aviso de que não constitui reserva confirmada

## Headers de Email

### Email da Agência
```
From: Beauty Travel <geral@beautytravel.pt>
Reply-To: cliente@email.com
Content-Type: text/html; charset=UTF-8
```

### Email do Cliente
```
From: Beauty Travel <geral@beautytravel.pt>
Reply-To: reservas@beautytravel.pt
Content-Type: text/html; charset=UTF-8
```

## Requisitos SMTP

Para garantir que os emails sejam entregues corretamente, recomenda-se:

1. **Plugin SMTP**: Instalar e configurar um plugin SMTP como:
   - WP Mail SMTP
   - Easy WP SMTP
   - Post SMTP

2. **Configuração SMTP**: Usar as credenciais do email `geral@beautytravel.pt`:
   - **Host**: smtp.gmail.com (para Google Workspace)
   - **Port**: 587 (TLS) ou 465 (SSL)
   - **Autenticação**: Sim
   - **Username**: geral@beautytravel.pt
   - **Password**: [senha do email]

3. **SPF/DKIM**: Configurar registros DNS para melhorar a deliverability:
   - SPF: Autorizar o servidor de email a enviar emails pelo domínio
   - DKIM: Assinar digitalmente os emails
   - DMARC: Definir políticas de autenticação

## Verificação de Configuração

Para verificar se as configurações de email estão corretas:

1. Acesse o painel administrativo do WordPress
2. Vá para a área de plugins
3. Localize "Soltour Booking V4"
4. Você verá um aviso informativo mostrando:
   - Email FROM atual
   - Email REPLY-TO atual
   - Instruções para personalizar

## Troubleshooting

### Emails não estão sendo enviados

1. **Verifique os logs do WordPress**:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```
   - Logs estarão em `/wp-content/debug.log`

2. **Teste o envio manual**:
   ```php
   wp_mail('seu-email@teste.com', 'Teste', 'Conteúdo de teste');
   ```

3. **Verifique configurações SMTP**:
   - Credenciais corretas
   - Porta correta
   - Firewall não está bloqueando

4. **Verifique spam**:
   - Emails podem estar indo para pasta de spam
   - Configure SPF/DKIM para melhorar reputação

### Emails estão indo para spam

1. Configure autenticação SMTP adequadamente
2. Configure registros SPF e DKIM no DNS
3. Use um serviço SMTP confiável (Google Workspace, SendGrid, etc.)
4. Evite palavras que acionam filtros de spam

### Reply-To não está funcionando

1. Verifique se a constante `SOLTOUR_EMAIL_REPLY_TO` está definida
2. Limpe o cache do WordPress
3. Verifique se não há conflitos com outros plugins de email

## Filtros e Hooks

O plugin fornece filtros para personalização avançada:

### Filtrar FROM email
```php
add_filter('wp_mail_from', function($from) {
    return 'custom@email.com';
});
```

### Filtrar FROM name
```php
add_filter('wp_mail_from_name', function($name) {
    return 'Custom Name';
});
```

## Suporte

Para questões relacionadas a configuração de email:

- **Email**: suporte@beautytravel.pt
- **Documentação**: https://github.com/Napster13Nord/soltour-booking-v2.4-ATUAL

---

**Última atualização**: 15/11/2025
**Versão do Plugin**: 4.2.0

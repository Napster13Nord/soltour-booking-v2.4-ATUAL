# 📋 PLANO: Reformulação da Página de Resultados

## 🎯 OBJETIVO
Modificar `/pacotes-resultados/` para seguir 100% o fluxo oficial do site Soltour.

---

## ❌ PROBLEMA ATUAL

### O que está errado:
1. **Múltiplas chamadas API desnecessárias**
   - Faz 1 chamada `/booking/availability`
   - Depois faz N chamadas `/booking/details` (1 por hotel)
   - Total: ~30 chamadas para 28 hotéis!

2. **Falta voo recomendado no topo**
   - Não mostra os voos selecionados
   - No site oficial tem um box grande no topo

3. **Botão errado**
   - Tem "Ver detalhes" que vai para `/detalhes-do-pacote/`
   - Deveria ter "Selecionar" que vai direto para `/cotacao/`

4. **Dados incompletos nos cards**
   - Não mostra tipos de quartos
   - Não mostra descrição curta
   - Não mostra preço POR QUARTO

---

## ✅ SOLUÇÃO: Fluxo Oficial

### 1. **UMA ÚNICA chamada API**
```javascript
POST /booking/availability
{
  forceAvail: true,
  item_count: 100,
  // ...params
}
```

**Response contém TUDO:**
```json
{
  "budgets": [
    {
      "budgetId": "...",
      "flightServices": [...],  // Voos ida/volta
      "hotelServices": [{
        "hotelCode": "...",
        "hotelName": "...",
        "categoryCode": "****",
        "description": "...",
        "rooms": [{           // QUARTOS DISPONÍVEIS
          "code": "...",
          "name": "Junior suite superior",
          "price": 2542
        }],
        "mealPlan": {...},
        "startDate": "...",
        "endDate": "..."
      }],
      "transferServices": [...],
      "priceBreakdown": {...}
    }
  ],
  "hotels": [...],  // Lista de hotéis com fotos
  "availToken": "..."
}
```

### 2. **Processar dados localmente**
```javascript
function processAvailabilityResponse(data) {
    // 1. Extrair voo recomendado (primeiro budget)
    const recommendedFlight = data.budgets[0].flightServices;

    // 2. Deduplic ar hotéis
    const uniqueHotels = {};
    data.budgets.forEach(budget => {
        const hotelCode = budget.hotelServices[0].hotelCode;
        if (!uniqueHotels[hotelCode]) {
            uniqueHotels[hotelCode] = {
                budget: budget,
                hotel: findHotelInList(hotelCode, data.hotels),
                rooms: extractRooms(budget.hotelServices[0])
            };
        }
    });

    // 3. Renderizar
    renderRecommendedFlight(recommendedFlight);
    renderHotelCards(Object.values(uniqueHotels));
}
```

### 3. **Box de Voo Recomendado** (no topo)
```html
<div class="recommended-flight-box">
    <div class="flight-badge">✈️ Voo recomendado desde Madrid</div>

    <div class="flight-row">
        <div class="flight-label">Saída</div>
        <div class="flight-info">
            <span class="airline">🛫 WorldFly</span>
            <span class="route">MAD → PUJ</span>
            <span class="times">14:55 - 19:15</span>
            <span class="bags">🧳 Malas</span>
        </div>
    </div>

    <div class="flight-row">
        <div class="flight-label">Regresso</div>
        <div class="flight-info">
            <span class="airline">🛬 WorldFly</span>
            <span class="route">PUJ → MAD</span>
            <span class="times">21:10 - 10:05+1</span>
            <span class="bags">🧳 Malas</span>
        </div>
    </div>

    <a href="#" class="change-flight-link">Ver detalhes ></a>
</div>
```

### 4. **Cards de Hotéis Completos**
```html
<div class="hotel-card">
    <img src="hotel-photo.jpg" />
    <div class="hotel-badge">⭐⭐⭐⭐</div>

    <h3>Bahía Príncipe Grand Turquesa</h3>
    <p class="hotel-category">Hotel 5 estrelas</p>
    <p class="hotel-description">
        A riqueza da província de Punta Cana...
    </p>

    <div class="hotel-rooms">
        <div class="room-option">
            <div class="room-details">
                <span class="room-name">Todo Incluído</span>
                <span class="room-price">desde 1.271€ / pax</span>
                <span class="room-total">Preço total 2.542€</span>
            </div>
            <div class="room-actions">
                <button class="btn-images">📷 Imágenes</button>
                <button class="btn-map">🗺️ Mapa</button>
            </div>
        </div>
        <button class="btn-selecionar">Selecionar</button>
    </div>

    <div class="expandable-section" style="display:none;">
        <!-- Mais quartos/opções -->
    </div>

    <button class="btn-expand">Juntar mais opções ▼</button>
</div>
```

### 5. **Botão "Selecionar"**
```javascript
function selectPackage(budgetId) {
    // Salvar no sessionStorage
    sessionStorage.setItem('soltour_selected_budget', JSON.stringify({
        budgetId: budgetId,
        availToken: SoltourApp.availToken
    }));

    // Redirecionar para cotação
    window.location.href = '/cotacao/';
}
```

---

## 📁 ARQUIVOS A MODIFICAR

### 1. `assets/js/soltour-booking.js`
**Remover:**
- ❌ Loop de chamadas `get_package_details`
- ❌ Função `enrichPackagesWithDetails()`
- ❌ Timeout de 500ms entre chamadas

**Adicionar:**
- ✅ `renderRecommendedFlight(flights)`
- ✅ `processAvailabilityDirectly(data)`
- ✅ Modificar `renderCompleteCard()` para usar dados do availability
- ✅ Trocar `selectPackage()` para ir para `/cotacao/`

### 2. `assets/css/soltour-style.css`
**Adicionar:**
- ✅ `.recommended-flight-box` (box azul no topo)
- ✅ `.hotel-rooms` (seção de quartos)
- ✅ `.btn-selecionar` (botão vermelho grande)
- ✅ `.btn-images`, `.btn-map` (botões secundários)

---

## ⚡ BENEFÍCIOS

### Performance:
- **Antes**: ~30 chamadas API (30-60 segundos)
- **Depois**: 1 chamada API (~3-5 segundos)
- **Melhoria**: 10x mais rápido! 🚀

### UX:
- ✅ Usuário vê voo selecionado
- ✅ Informações completas nos cards
- ✅ Fluxo direto: Selecionar → Cotação
- ✅ Sem página intermediária desnecessária

### Código:
- ✅ ~500 linhas removidas
- ✅ Mais simples e manutenível
- ✅ Segue padrão oficial Soltour

---

## 🧪 TESTES NECESSÁRIOS

1. ✅ Voo recomendado aparece no topo
2. ✅ Cards mostram todos os quartos disponíveis
3. ✅ Preços corretos (por pessoa + total)
4. ✅ Botão "Selecionar" redireciona para `/cotacao/`
5. ✅ Filtros funcionam (nome, preço, estrelas)
6. ✅ Paginação funciona
7. ✅ Responsivo (mobile-friendly)

---

## ✅ PRÓXIMA ETAPA APÓS APROVAR

Se você aprovar este plano:
1. Modifico `soltour-booking.js` (remove múltiplas chamadas)
2. Adiciono renderização de voo recomendado
3. Modifico cards para mostrar quartos
4. Adiciono CSS novo
5. Testo tudo
6. Commit + Push

**APROVA?** 🚀

// Supabase Cloud Database Configuration
// Se deseja hospedar na Vercel com um banco de dados real na nuvem, basta criar
// um projeto gratuito no Supabase (supabase.com) e preencher estas duas chaves.
// Se as chaves estiverem vazias, o sistema funcionará AUTOMATICAMENTE no Modo Offline (LocalStorage),
// salvando todas as contas e dados localmente no navegador sem precisar de configuração!
const SUPABASE_URL = ""; 
const SUPABASE_ANON_KEY = "";

let supabaseClient = null;
let isOfflineMode = true;
let currentUserEmail = null;

// Initialize Supabase Client safely
if (SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "") {
    try {
        const lib = (typeof window !== 'undefined' && window.supabase) || (typeof supabase !== 'undefined' ? supabase : null) || (typeof supabasejs !== 'undefined' ? supabasejs : null);
        if (lib && lib.createClient) {
            supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isOfflineMode = false;
            console.log("Supabase inicializado com sucesso!");
        } else {
            console.warn("Biblioteca do Supabase não encontrada no escopo global.");
        }
    } catch (e) {
        console.error("Falha ao inicializar o Supabase, ativando Modo Offline:", e);
        isOfflineMode = true;
    }
}

// Helper to get stock quantity by item ID
function getStockQty(itemId) {
    if (!state || !state.inventory) return 0;
    const item = state.inventory.find(i => i.id === itemId);
    return item ? item.qty : 0;
}

// State Management
let state = {
    balance: 15000.00,
    bypassXP: false,
    playerXP: 0,
    transactions: [
        {
            id: 't-init-1',
            desc: 'Saldo Inicial de Caixa',
            type: 'income',
            category: 'Outros',
            value: 15000.00,
            date: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
        },
        {
            id: 't-init-2',
            desc: 'Compra de Ferramentas de Mineração',
            type: 'expense',
            category: 'Mineração',
            value: 1200.00,
            date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
    ],
    inventory: [
        // Default Mining Items
        { id: 'ferro_bruto', name: 'Ferro Bruto', category: 'mineracao', type: 'raw', qty: 45, minQty: 20, label: 'FE' },
        { id: 'ferro_forjado', name: 'Ferro Forjado', category: 'mineracao', type: 'forged', qty: 12, minQty: 10, label: 'FE+' },
        { id: 'cobre_bruto', name: 'Cobre Bruto', category: 'mineracao', type: 'raw', qty: 62, minQty: 20, label: 'CU' },
        { id: 'cobre_forjado', name: 'Cobre Forjado', category: 'mineracao', type: 'forged', qty: 28, minQty: 10, label: 'CU+' },
        { id: 'prata_bruto', name: 'Prata Bruto', category: 'mineracao', type: 'raw', qty: 15, minQty: 15, label: 'AG' },
        { id: 'prata_forjado', name: 'Prata Forjado', category: 'mineracao', type: 'forged', qty: 4, minQty: 8, label: 'AG+' },
        { id: 'aco_bruto', name: 'Aço Bruto', category: 'mineracao', type: 'raw', qty: 8, minQty: 15, label: 'AC' },
        { id: 'aco_forjado', name: 'Aço Forjado', category: 'mineracao', type: 'forged', qty: 3, minQty: 8, label: 'AC+' },
        { id: 'titanio_bruto', name: 'Titânio Bruto', category: 'mineracao', type: 'raw', qty: 3, minQty: 10, label: 'TI' },
        { id: 'titanio_forjado', name: 'Titânio Forjado', category: 'mineracao', type: 'forged', qty: 1, minQty: 5, label: 'TI+' },
        
        // 3D Printer Materials
        { id: 'borracha', name: 'Composto de Borracha', category: 'impressora3d', type: 'raw', qty: 30, minQty: 15, label: 'BO' },
        { id: 'plastico', name: 'Plástico', category: 'impressora3d', type: 'raw', qty: 50, minQty: 25, label: 'PL' },
        { id: 'aco_lamina', name: 'Aço de Lâmina', category: 'impressora3d', type: 'raw', qty: 10, minQty: 10, label: 'AL' },
        
        // 3D Printer Crafted Products
        { id: 'base_ecu', name: 'Base de ECU', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'BE' },
        { id: 'caixa_filtro_esportiva', name: 'Caixa de Filtro Esportiva', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'CF' },
        { id: 'caixa_fusiveis', name: 'Caixa de Fusíveis', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'CFs' },
        { id: 'carcaca_ecu_ecumaster', name: 'Carcaça ECU Ecumaster', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'CE' },
        { id: 'carcaca_ecu_octtane', name: 'Carcaça ECU Octtane', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'CO' },
        { id: 'carcaca_sensor', name: 'Carcaça de Sensor', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'CS' },
        { id: 'duto_admissao', name: 'Duto de Admissão', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'DA' },
        { id: 'duto_intercooler', name: 'Duto de Intercooler', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'DI' },
        { id: 'faca_simples', name: 'Faca Simples', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'FS' },
        { id: 'moldura_filtro', name: 'Moldura de Filtro', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'MF' },
        { id: 'suporte_ecu', name: 'Suporte de ECU', category: 'impressora3d', type: 'other', qty: 0, minQty: 5, label: 'SE' },

        // Kitchen Raw Ingredients
        { id: 'milho', name: 'Milho', category: 'cozinha', type: 'raw', qty: 25, minQty: 10, label: 'MI' },
        { id: 'trigo', name: 'Trigo', category: 'cozinha', type: 'raw', qty: 20, minQty: 10, label: 'TR' },
        { id: 'alface', name: 'Alface', category: 'cozinha', type: 'raw', qty: 20, minQty: 10, label: 'AL' },
        { id: 'tomate', name: 'Tomate', category: 'cozinha', type: 'raw', qty: 15, minQty: 10, label: 'TO' },
        { id: 'frutas', name: 'Frutas', category: 'cozinha', type: 'raw', qty: 15, minQty: 10, label: 'FR' },
        { id: 'feijao', name: 'Feijão', category: 'cozinha', type: 'raw', qty: 20, minQty: 10, label: 'FE' },
        { id: 'arroz', name: 'Arroz', category: 'cozinha', type: 'raw', qty: 20, minQty: 10, label: 'AR' },
        { id: 'batata', name: 'Batata', category: 'cozinha', type: 'raw', qty: 30, minQty: 15, label: 'BA' },
        { id: 'agua', name: 'Água', category: 'cozinha', type: 'raw', qty: 40, minQty: 20, label: 'AG' },
        { id: 'grao_cafe', name: 'Grão de Café', category: 'cozinha', type: 'raw', qty: 15, minQty: 10, label: 'GC' },

        // Kitchen Crafted Food Products
        { id: 'pao_milho', name: 'Pão de Milho', category: 'cozinha', type: 'other', qty: 2, minQty: 5, label: 'PM' },
        { id: 'pipoca', name: 'Pipoca', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'PI' },
        { id: 'salada', name: 'Salada', category: 'cozinha', type: 'other', qty: 1, minQty: 5, label: 'SA' },
        { id: 'salada_frutas', name: 'Salada de Frutas', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'SF' },
        { id: 'feijao_arroz', name: 'Feijão e Arroz', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'FA' },
        { id: 'batata_cozida', name: 'Batata Cozida', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'BC' },
        { id: 'batata_frita', name: 'Batata Frita', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'BF' },
        { id: 'cafe', name: 'Café', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'CF' },
        { id: 'sanduiche', name: 'Sanduíche', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'SN' },
        { id: 'burger', name: 'Burger', category: 'cozinha', type: 'other', qty: 0, minQty: 5, label: 'BU' },

        // Moinho de Refino Raw Materials
        { id: 'borracha_bruta', name: 'Borracha Bruta', category: 'moinho', type: 'raw', qty: 20, minQty: 10, label: 'BB' },
        
        // Moinho de Refino Crafted Products
        { id: 'fio_cobre', name: 'Fio de Cobre', category: 'moinho', type: 'other', qty: 0, minQty: 5, label: 'FC' },
        { id: 'po_aluminio', name: 'Pó de Alumínio', category: 'moinho', type: 'other', qty: 0, minQty: 5, label: 'PA' },
        { id: 'po_aco', name: 'Pó de Aço', category: 'moinho', type: 'other', qty: 0, minQty: 5, label: 'PAC' },

        // Industrial Powder Printer Input Materials
        { id: 'pecas_arma', name: 'Peças de Arma', category: 'impressorapo', type: 'raw', qty: 10, minQty: 5, label: 'PArm' },

        // Industrial Powder Printer Crafted Products (21 items from screenshots)
        { id: 'bloco_bruto_aluminio', name: 'Bloco Bruto de Alumínio', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'BAl' },
        { id: 'bloco_bruto_ferro', name: 'Bloco Bruto de Ferro', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'BFe' },
        { id: 'cabecote_bruto', name: 'Cabeçote Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CBr' },
        { id: 'caixa_lateral_intercooler', name: 'Caixa Lateral de Intercooler', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CLI' },
        { id: 'carcaca_cambio_bruta', name: 'Carcaça de Câmbio Bruta', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CCB' },
        { id: 'carcaca_diferencial_bruta', name: 'Carcaça de Diferencial Bruta', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CDB' },
        { id: 'carcaca_turbo_media', name: 'Carcaça de Turbo Média', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CTM' },
        { id: 'carcaca_turbo_pequena', name: 'Carcaça de Turbo Pequena', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CTP' },
        { id: 'carcaca_turbo_race', name: 'Carcaça de Turbo Race', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CTR' },
        { id: 'coletor_escape_bruto', name: 'Coletor de Escape Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CEB' },
        { id: 'comando_bruto', name: 'Comando Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'COB' },
        { id: 'conjunto_pecas_pistola', name: 'Conjunto de Peças de Pistola', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CPP' },
        { id: 'corpo_borboleta_bruto', name: 'Corpo de Borboleta Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'CBB' },
        { id: 'flauta_combustivel_bruta', name: 'Flauta de Combustível Bruta', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'FCB' },
        { id: 'molde_biela_usinada', name: 'Molde de Biela Usinada', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'MBU' },
        { id: 'molde_pistao_usinado', name: 'Molde de Pistão Usinado', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'MPU' },
        { id: 'nucleo_bruto_intercooler', name: 'Núcleo Bruto de Intercooler', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'NBI' },
        { id: 'nucleo_bruto_radiador', name: 'Núcleo Bruto de Radiador', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'NBR' },
        { id: 'rotor_compressor', name: 'Rotor Compressor', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'RCm' },
        { id: 'virabrequim_bruto', name: 'Virabrequim Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'VBr' },
        { id: 'volante_motor_bruto', name: 'Volante de Motor Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'VMB' }
    ],
    currentFilter: 'all'
};

// 3D Printer Recipe Data (based on screenshots)
const printerRecipes = [
    { id: 'base_ecu', name: 'Base de ECU', time: '03:00', materials: { borracha: 1, plastico: 4 }, skill: 'mecanico', xp: 150 },
    { id: 'caixa_filtro_esportiva', name: 'Caixa de Filtro Esportiva', time: '05:00', materials: { borracha: 2, plastico: 6 }, skill: 'mecanico', xp: 150 },
    { id: 'caixa_fusiveis', name: 'Caixa de Fusíveis', time: '03:30', materials: { borracha: 1, plastico: 5 }, skill: 'mecanico', xp: 150 },
    { id: 'carcaca_ecu_ecumaster', name: 'Carcaça ECU Ecumaster', time: '04:20', materials: { borracha: 1, plastico: 6 }, skill: 'mecanico', xp: 150 },
    { id: 'carcaca_ecu_octtane', name: 'Carcaça ECU Octtane', time: '04:00', materials: { borracha: 1, plastico: 5 }, skill: 'mecanico', xp: 150 },
    { id: 'carcaca_sensor', name: 'Carcaça de Sensor', time: '02:00', materials: { borracha: 1, plastico: 2 }, skill: 'mecanico', xp: 150 },
    { id: 'duto_admissao', name: 'Duto de Admissão', time: '03:00', materials: { borracha: 2, plastico: 8 }, skill: 'mecanico', xp: 150 },
    { id: 'duto_intercooler', name: 'Duto de Intercooler', time: '04:00', materials: { borracha: 2, plastico: 5 }, skill: 'mecanico', xp: 150 },
    { id: 'faca_simples', name: 'Faca Simples', time: '02:30', materials: { borracha: 1, aco_lamina: 2 }, skill: 'mecanico', xp: 150 },
    { id: 'moldura_filtro', name: 'Moldura de Filtro', time: '02:30', materials: { borracha: 2, plastico: 4 }, skill: 'mecanico', xp: 150 },
    { id: 'suporte_ecu', name: 'Suporte de ECU', time: '02:30', materials: { borracha: 2, plastico: 3 }, skill: 'mecanico', xp: 150 }
];

// Kitchen Recipe Data (based on screenshots)
const kitchenRecipes = [
    { id: 'pao_milho', name: 'Pão de Milho', ingredients: { milho: 2, trigo: 1 }, resultQty: 1, time: 5 },
    { id: 'pipoca', name: 'Pipoca', ingredients: { milho: 2 }, resultQty: 1, time: 3 },
    { id: 'salada', name: 'Salada', ingredients: { alface: 2, tomate: 1 }, resultQty: 1, time: 4 },
    { id: 'salada_frutas', name: 'Salada de Frutas', ingredients: { frutas: 3 }, resultQty: 1, time: 4 },
    { id: 'feijao_arroz', name: 'Feijão e Arroz', ingredients: { feijao: 2, arroz: 2 }, resultQty: 1, time: 6 },
    { id: 'batata_cozida', name: 'Batata Cozida', ingredients: { batata: 2, agua: 1 }, resultQty: 1, time: 5 },
    { id: 'batata_frita', name: 'Batata Frita', ingredients: { batata: 3 }, resultQty: 1, time: 4 },
    { id: 'cafe', name: 'Café', ingredients: { grao_cafe: 2, agua: 1 }, resultQty: 1, time: 3 },
    { id: 'sanduiche', name: 'Sanduíche', ingredients: { pao_milho: 2 }, resultQty: 1, time: 5 },
    { id: 'burger', name: 'Burger', ingredients: { pao_milho: 2, salada: 1 }, resultQty: 1, time: 7 }
];

// Moinho de Refino Recipe Data (based on screenshot)
const moinhoRecipes = [
    { id: 'borracha', name: 'Composto de Borracha', time: '00:12', materials: { borracha_bruta: 2 }, skill: 'mecanico', xp: 0 },
    { id: 'fio_cobre', name: 'Fio de Cobre', time: '00:10', materials: { cobre_forjado: 1 }, skill: 'mecanico', xp: 0 },
    { id: 'po_aluminio', name: 'Pó de Alumínio', time: '00:36', materials: { ferro_forjado: 3 }, skill: 'mecanico', xp: 0 },
    { id: 'po_aco', name: 'Pó de Aço', time: '00:25', materials: { aco_forjado: 2 }, skill: 'mecanico', xp: 0 }
];

// Impressora Industrial de Pó Recipe Data (based on screenshots)
const poRecipes = [
    { id: 'bloco_bruto_aluminio', name: 'Bloco Bruto de Alumínio', time: '05:00', materials: { po_aluminio: 15, po_aco: 4 }, skill: 'mecanico', xp: 700 },
    { id: 'bloco_bruto_ferro', name: 'Bloco Bruto de Ferro', time: '05:00', materials: { po_aluminio: 2, po_aco: 13 }, skill: 'mecanico', xp: 700 },
    { id: 'cabecote_bruto', name: 'Cabeçote Bruto', time: '05:00', materials: { po_aluminio: 9, po_aco: 2 }, skill: 'mecanico', xp: 700 },
    { id: 'caixa_lateral_intercooler', name: 'Caixa Lateral de Intercooler', time: '05:00', materials: { po_aluminio: 4 }, skill: 'mecanico', xp: 700 },
    { id: 'carcaca_cambio_bruta', name: 'Carcaça de Câmbio Bruta', time: '05:00', materials: { po_aluminio: 10, po_aco: 4 }, skill: 'mecanico', xp: 700 },
    { id: 'carcaca_diferencial_bruta', name: 'Carcaça de Diferencial Bruta', time: '05:00', materials: { po_aluminio: 3, po_aco: 8 }, skill: 'mecanico', xp: 700 },
    { id: 'carcaca_turbo_media', name: 'Carcaça de Turbo Média', time: '05:00', materials: { po_aluminio: 7, po_aco: 3 }, skill: 'mecanico', xp: 700 },
    { id: 'carcaca_turbo_pequena', name: 'Carcaça de Turbo Pequena', time: '05:00', materials: { po_aluminio: 5, po_aco: 2 }, skill: 'mecanico', xp: 700 },
    { id: 'carcaca_turbo_race', name: 'Carcaça de Turbo Race', time: '05:00', materials: { po_aluminio: 9, po_aco: 5 }, skill: 'mecanico', xp: 700 },
    { id: 'coletor_escape_bruto', name: 'Coletor de Escape Bruto', time: '05:00', materials: { po_aluminio: 2, po_aco: 7 }, skill: 'mecanico', xp: 700 },
    { id: 'comando_bruto', name: 'Comando Bruto', time: '05:00', materials: { po_aluminio: 1, po_aco: 7 }, skill: 'mecanico', xp: 700 },
    { id: 'conjunto_pecas_pistola', name: 'Conjunto de Peças de Pistola', time: '05:00', materials: { po_aluminio: 1, pecas_arma: 2, po_aco: 3 }, skill: 'mecanico', xp: 700 },
    { id: 'corpo_borboleta_bruto', name: 'Corpo de Borboleta Bruto', time: '05:00', materials: { po_aluminio: 4, po_aco: 1 }, skill: 'mecanico', xp: 700 },
    { id: 'flauta_combustivel_bruta', name: 'Flauta de Combustível Bruta', time: '05:00', materials: { po_aluminio: 4, fio_cobre: 1 }, skill: 'mecanico', xp: 700 },
    { id: 'molde_biela_usinada', name: 'Molde de Biela Usinada', time: '05:00', materials: { po_aluminio: 1, po_aco: 3 }, skill: 'mecanico', xp: 700 },
    { id: 'molde_pistao_usinado', name: 'Molde de Pistão Usinado', time: '05:00', materials: { po_aluminio: 2, po_aco: 1 }, skill: 'mecanico', xp: 700 },
    { id: 'nucleo_bruto_intercooler', name: 'Núcleo Bruto de Intercooler', time: '05:00', materials: { po_aluminio: 6, fio_cobre: 2 }, skill: 'mecanico', xp: 700 },
    { id: 'nucleo_bruto_radiador', name: 'Núcleo Bruto de Radiador', time: '05:00', materials: { po_aluminio: 6, fio_cobre: 2 }, skill: 'mecanico', xp: 700 },
    { id: 'rotor_compressor', name: 'Rotor Compressor', time: '05:00', materials: { po_aluminio: 4, po_aco: 1 }, skill: 'mecanico', xp: 700 },
    { id: 'virabrequim_bruto', name: 'Virabrequim Bruto', time: '05:00', materials: { po_aluminio: 2, po_aco: 10 }, skill: 'mecanico', xp: 700 },
    { id: 'volante_motor_bruto', name: 'Volante de Motor Bruto', time: '05:00', materials: { po_aluminio: 2, po_aco: 6 }, skill: 'mecanico', xp: 700 }
];

// Cooking Slots active state
let cookingSlots = [
    { itemId: null, itemName: null, qty: 0, duration: 0, elapsed: 0, intervalId: null },
    { itemId: null, itemName: null, qty: 0, duration: 0, elapsed: 0, intervalId: null },
    { itemId: null, itemName: null, qty: 0, duration: 0, elapsed: 0, intervalId: null },
    { itemId: null, itemName: null, qty: 0, duration: 0, elapsed: 0, intervalId: null }
];

let kitchenSearchQuery = "";

// LocalStorage Keys
const STORAGE_KEY = 'street_car_club_dashboard_state';

// Custom Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: rgba(15, 17, 24, 0.95);
        border-left: 4px solid ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-orange)'};
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 8px;
        font-family: var(--font-main);
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 280px;
    `;

    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'ri-checkbox-circle-fill' : type === 'error' ? 'ri-error-warning-fill' : 'ri-alert-fill';
    icon.style.color = type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-orange)';
    icon.style.fontSize = '1.2rem';
    
    const textNode = document.createElement('span');
    textNode.innerText = message;

    toast.appendChild(icon);
    toast.appendChild(textNode);
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Initialise Application
function init() {
    setupEventListeners();
    updateMiningCalcOutput();
    checkAuthSession();
}

// Auth and Session Control
let authMode = 'login'; // 'login' or 'signup'

function toggleAuthMode(event) {
    if (event) event.preventDefault();
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const toggleLabel = document.getElementById('auth-toggle-label');
    const btnText = document.getElementById('auth-btn-text');
    const messageDiv = document.getElementById('auth-message');
    
    if (messageDiv) messageDiv.style.display = 'none';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    if (authMode === 'login') {
        authMode = 'signup';
        if (toggleBtn) toggleBtn.innerText = 'Entrar';
        if (toggleLabel) toggleLabel.innerText = 'Já possui uma conta?';
        if (btnText) btnText.innerText = 'Criar Nova Conta';
    } else {
        authMode = 'login';
        if (toggleBtn) toggleBtn.innerText = 'Criar Conta';
        if (toggleLabel) toggleLabel.innerText = 'Não possui uma conta?';
        if (btnText) btnText.innerText = 'Entrar no Painel';
    }
}

async function checkAuthSession() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    
    if (!isOfflineMode && supabaseClient) {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                currentUserEmail = session.user.email;
                if (loginContainer) loginContainer.style.display = 'none';
                if (appContainer) appContainer.style.display = 'flex';
                await loadUserData();
                updateUI();
                return;
            }
        } catch (e) {
            console.error("Error reading Supabase session:", e);
        }
    }
    
    // Fallback/Offline check
    const loggedInUser = localStorage.getItem('s6_logged_in_user');
    if (loggedInUser) {
        currentUserEmail = loggedInUser;
        if (loginContainer) loginContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        loadUserDataLocal();
        updateUI();
    } else {
        if (loginContainer) loginContainer.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }
}

async function handleAuthSubmit(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const messageDiv = document.getElementById('auth-message');
    const btn = document.getElementById('auth-btn');
    
    if (!email || !password) return;
    
    if (messageDiv) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'auth-message';
        messageDiv.innerText = 'Processando...';
    }
    if (btn) btn.disabled = true;
    
    try {
        if (!isOfflineMode && supabaseClient) {
            // Online Mode Auth with Supabase
            if (authMode === 'login') {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast("Conectado com sucesso!", "success");
                currentUserEmail = data.user.email;
                await checkAuthSession();
            } else {
                const { data, error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                if (messageDiv) {
                    messageDiv.className = 'auth-message auth-message-success';
                    messageDiv.innerText = 'Conta criada! Confirme seu e-mail ou tente fazer login.';
                }
                showToast("Conta criada! Realize login.", "success");
                toggleAuthMode();
            }
        } else {
            // Offline LocalStorage Mock Auth
            let localUsers = JSON.parse(localStorage.getItem('s6_users') || '{}');
            if (authMode === 'login') {
                if (localUsers[email] && localUsers[email].password === password) {
                    localStorage.setItem('s6_logged_in_user', email);
                    currentUserEmail = email;
                    showToast("Login local realizado!", "success");
                    await checkAuthSession();
                } else {
                    throw new Error("E-mail ou senha incorretos.");
                }
            } else {
                if (localUsers[email]) {
                    throw new Error("Este e-mail já está cadastrado.");
                }
                localUsers[email] = { password, data: null };
                localStorage.setItem('s6_users', JSON.stringify(localUsers));
                if (messageDiv) {
                    messageDiv.className = 'auth-message auth-message-success';
                    messageDiv.innerText = 'Conta criada localmente com sucesso! Faça login.';
                }
                showToast("Conta local criada!", "success");
                toggleAuthMode();
            }
        }
    } catch (err) {
        console.error("Auth error:", err);
        if (messageDiv) {
            messageDiv.className = 'auth-message auth-message-error';
            messageDiv.innerText = err.message || "Erro desconhecido na autenticação.";
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function logoutUser() {
    if (!isOfflineMode && supabaseClient) {
        try {
            await supabaseClient.auth.signOut();
        } catch (e) {
            console.error("Error signing out of Supabase:", e);
        }
    }
    localStorage.removeItem('s6_logged_in_user');
    currentUserEmail = null;
    
    // Reset DOM visibility
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    
    // Clear inputs
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const messageDiv = document.getElementById('auth-message');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (messageDiv) messageDiv.style.display = 'none';
    
    showToast("Sessão encerrada.", "success");
}

// Database Load and Save Logic
function getZeroedState() {
    const zeroedInventory = state.inventory.map(item => {
        return {
            ...item,
            qty: 0
        };
    });
    return {
        balance: 0.00,
        bypassXP: false,
        playerXP: 0,
        transactions: [],
        inventory: zeroedInventory
    };
}

function setPlayerXP(value) {
    const xp = Math.max(0, parseInt(value) || 0);
    state.playerXP = xp;
    // Update XP badge visual
    const badge = document.getElementById('header-xp-badge');
    if (badge) badge.textContent = `XP: ${xp.toLocaleString('pt-BR')}`;
    saveToLocalStorage();
    // Re-render all sections that use XP gating (always, so navigating to them shows the updated state)
    renderPrinterPo();
    renderPrinter3D();
    renderMoinho();
}

async function loadUserData() {
    if (!currentUserEmail) return;
    
    if (!isOfflineMode && supabaseClient) {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session || !session.user) return;
            
            const userId = session.user.id;
            // Fetch profile
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('data')
                .eq('id', userId)
                .single();
                
            if (error) {
                if (error.code === 'PGRST116') {
                    // Profile doesn't exist, create default profile row (zeroed for new user!)
                    const defaultData = getZeroedState();
                    const { error: insertError } = await supabaseClient
                        .from('user_profiles')
                        .insert({ id: userId, email: currentUserEmail, data: defaultData });
                    
                    if (insertError) throw insertError;
                    
                    state.balance = defaultData.balance;
                    state.bypassXP = defaultData.bypassXP;
                    state.playerXP = defaultData.playerXP || 0;
                    state.transactions = defaultData.transactions;
                    state.inventory = defaultData.inventory;
                } else {
                    throw error;
                }
            } else if (data && data.data) {
                const parsed = data.data;
                state.balance = parsed.balance;
                state.bypassXP = parsed.bypassXP || false;
                state.playerXP = parsed.playerXP || 0;
                state.transactions = parsed.transactions || [];
                
                // Merge inventory with defaults
                const defaultInventoryMap = new Map(state.inventory.map(item => [item.id, item]));
                const currentIds = parsed.inventory ? parsed.inventory.map(i => i.id) : [];
                
                if (parsed.inventory) {
                    state.inventory = [...parsed.inventory];
                    defaultInventoryMap.forEach((defItem, id) => {
                        if (!currentIds.includes(id)) {
                            state.inventory.push(defItem);
                        }
                    });
                }
            }
            return;
        } catch (e) {
            console.error("Error loading user data from Supabase:", e);
            showToast("Erro ao carregar dados da nuvem. Usando local.", "error");
        }
    }
    
    loadUserDataLocal();
}

function loadUserDataLocal() {
    if (!currentUserEmail) return;
    
    const key = `s6_user_data_${currentUserEmail}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.balance = parsed.balance;
            state.bypassXP = parsed.bypassXP || false;
            state.playerXP = parsed.playerXP || 0;
            state.transactions = parsed.transactions || [];
            
            const defaultInventoryMap = new Map(state.inventory.map(item => [item.id, item]));
            const currentIds = parsed.inventory ? parsed.inventory.map(i => i.id) : [];
            
            if (parsed.inventory) {
                state.inventory = [...parsed.inventory];
                defaultInventoryMap.forEach((defItem, id) => {
                    if (!currentIds.includes(id)) {
                        state.inventory.push(defItem);
                    }
                });
            }
        } catch (e) {
            console.error("Failed to parse local user data:", e);
        }
    } else {
        // No saved state for this user, initialize to zeroed starting state
        const defaultData = getZeroedState();
        state.balance = defaultData.balance;
        state.bypassXP = defaultData.bypassXP;
        state.playerXP = defaultData.playerXP;
        state.transactions = defaultData.transactions;
        state.inventory = defaultData.inventory;
        // Save immediately
        localStorage.setItem(key, JSON.stringify(defaultData));
    }
}

async function saveUserData() {
    if (!currentUserEmail) return;
    
    const dataToSave = {
        balance: state.balance,
        inventory: state.inventory,
        transactions: state.transactions,
        bypassXP: state.bypassXP,
        playerXP: state.playerXP
    };
    
    // Save locally always as backup
    const key = `s6_user_data_${currentUserEmail}`;
    localStorage.setItem(key, JSON.stringify(dataToSave));
    
    if (!isOfflineMode && supabaseClient) {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                const userId = session.user.id;
                const { error } = await supabaseClient
                    .from('user_profiles')
                    .upsert({ 
                        id: userId, 
                        email: currentUserEmail, 
                        data: dataToSave,
                        updated_at: new Date().toISOString()
                    });
                if (error) throw error;
            }
        } catch (e) {
            console.error("Failed to save data to Supabase:", e);
        }
    }
}

// Save state to local storage and cloud database
function saveToLocalStorage() {
    saveUserData();
}

// Event Listeners setup
function setupEventListeners() {
    document.getElementById('calc-raw-qty').addEventListener('keyup', updateMiningCalcOutput);
}

// Update all UI Components
function updateUI() {
    saveToLocalStorage();
    
    const formattedBalance = formatCurrency(state.balance);
    const headerBal = document.getElementById('header-balance');
    const dashBal = document.getElementById('dash-balance');
    const dashTot = document.getElementById('dash-total-items');
    const dashRaw = document.getElementById('dash-raw-minerals');
    const dashLow = document.getElementById('dash-low-stock');
    const finBalVal = document.getElementById('finance-balance-val');
    
    if (headerBal) headerBal.textContent = `Saldo: ${formattedBalance}`;
    if (dashBal) dashBal.textContent = formattedBalance;

    // Sync XP header field with saved state
    const xpInput = document.getElementById('header-xp-input');
    const xpBadge = document.getElementById('header-xp-badge');
    if (xpInput) xpInput.value = state.playerXP || 0;
    if (xpBadge) xpBadge.textContent = `XP: ${(state.playerXP || 0).toLocaleString('pt-BR')}`;
    
    const totalItems = state.inventory.reduce((acc, curr) => acc + curr.qty, 0);
    if (dashTot) dashTot.textContent = `${totalItems} u.`;
    
    const rawMinerals = state.inventory
        .filter(item => item.category === 'mineracao' && item.type === 'raw')
        .reduce((acc, curr) => acc + curr.qty, 0);
    if (dashRaw) dashRaw.textContent = `${rawMinerals} u.`;
    
    const lowStockItems = state.inventory.filter(item => item.qty < item.minQty);
    if (dashLow) dashLow.textContent = `${lowStockItems.length} itens`;
    
    if (finBalVal) finBalVal.textContent = formattedBalance;
    
    const incomes = state.transactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.value, 0);
    const finIncomes = document.getElementById('finance-incomes-val');
    if (finIncomes) finIncomes.textContent = formatCurrency(incomes);
    
    const expenses = state.transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.value, 0);
    const finExpenses = document.getElementById('finance-expenses-val');
    if (finExpenses) finExpenses.textContent = formatCurrency(expenses);
    
    renderRecentTransactions();
    renderTransactionsTable();
    renderLowStockAlerts();
    renderMiningInventory();
    renderStockTable();
    renderPrinter3D();
    renderCozinha();
    renderMoinho();
    renderPrinterPo();
    
    // Update mineral purchase calculator balance
    const calcBal = document.getElementById('buy-current-balance');
    if (calcBal) {
        calcBal.innerText = formatCurrency(state.balance);
        calculateMineralBuyTotal();
    }
}

// Format number as currency (BRL)
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Switch Sections (SPA navigation)
function switchSection(sectionId) {
    const sections = ['dashboard', 'mineracao', 'cozinha', 'impressora3d', 'moinho', 'impressorapo', 'gastos', 'estoque', 'calc-compra'];
    
    sections.forEach(sec => {
        const elem = document.getElementById(`${sec}-section`);
        const navElem = document.getElementById(`nav-${sec}`);
        if (elem) elem.classList.remove('active');
        if (navElem) navElem.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionId}-section`);
    const targetNav = document.getElementById(`nav-${sectionId}`);
    if (targetSection) targetSection.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    
    const headerTitle = document.getElementById('page-title');
    const headerDesc = document.getElementById('page-description');
    
    switch (sectionId) {
        case 'dashboard':
            headerTitle.textContent = "Dashboard Geral";
            headerDesc.textContent = "Visão geral das operações, estoque crítico e resumo financeiro.";
            break;
        case 'mineracao':
            headerTitle.textContent = "Mineração S6";
            headerDesc.textContent = "Gestão de minérios brutos e processador de refinamento de ligas metálicas.";
            break;
        case 'calc-compra':
            headerTitle.textContent = "Compra de Minérios";
            headerDesc.textContent = "Calculadora e abastecimento de estoque com cotação de minérios S6.";
            break;
        case 'cozinha':
            headerTitle.textContent = "Cozinha Industrial";
            headerDesc.textContent = "Slots de preparo e receitas de alimentos, pratos e sucos do clube.";
            break;
        case 'impressora3d':
            headerTitle.textContent = "Impressora 3D";
            headerDesc.textContent = "Fabricação de peças leves, molduras, fivelas e carcaças de ECU.";
            break;
        case 'moinho':
            headerTitle.textContent = "Moinho de Refino";
            headerDesc.textContent = "Centrifugadora, trituração de metais em pó e refino de borracha.";
            break;
        case 'impressorapo':
            headerTitle.textContent = "Impressora Industrial de Pó";
            headerDesc.textContent = "Sinterização a laser (DMLS) de blocos de motor, turbinas e bielas.";
            break;
        case 'gastos':
            headerTitle.textContent = "Gestão Financeira";
            headerDesc.textContent = "Fluxo de caixa, histórico de faturamento e registro de despesas operacionais.";
            break;
        case 'estoque':
            headerTitle.textContent = "Controle de Estoque";
            headerDesc.textContent = "Gestão de inventário global, ajuste manual e cadastro de novos itens.";
            break;
    }
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toggle Sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

/* ==========================================================================
   MINING SECTION LOGIC
   ========================================================================== */

function updateMiningCalcOutput() {
    const materialKey = document.getElementById('calc-material-select').value;
    const rawQtyInput = document.getElementById('calc-raw-qty');
    let rawQty = parseInt(rawQtyInput.value) || 0;
    
    if (rawQty < 0) {
        rawQty = 0;
        rawQtyInput.value = 0;
    }
    
    const forgedQty = Math.floor(rawQty / 2);
    const remainder = rawQty % 2;
    
    const cShowRaw = document.getElementById('calc-show-raw');
    const cShowForged = document.getElementById('calc-show-forged');
    const remainderText = document.getElementById('calc-remainder-text');
    
    if (cShowRaw) cShowRaw.textContent = rawQty;
    if (cShowForged) cShowForged.textContent = forgedQty;
    
    if (remainderText) {
        if (remainder > 0) {
            remainderText.innerHTML = `Sobra: <span style="color: var(--accent-orange); font-weight:600;">${remainder}</span> material bruto não processado.`;
        } else {
            remainderText.textContent = "Nenhuma sobra de material bruto.";
        }
    }
}

function executeRefineryProcess() {
    const materialSelect = document.getElementById('calc-material-select');
    const materialKey = materialSelect.value; 
    const rawQtyInput = document.getElementById('calc-raw-qty');
    const rawQtyToProcess = parseInt(rawQtyInput.value) || 0;
    
    if (rawQtyToProcess <= 0) {
        showToast("Insira uma quantidade maior que zero para refinar.", "error");
        return;
    }
    
    const rawItemId = `${materialKey}_bruto`;
    const forgedItemId = `${materialKey}_forjado`;
    
    const rawStockItem = state.inventory.find(i => i.id === rawItemId);
    const forgedStockItem = state.inventory.find(i => i.id === forgedItemId);
    
    if (!rawStockItem || !forgedStockItem) {
        showToast("Erro ao localizar itens de mineração.", "error");
        return;
    }
    
    if (rawStockItem.qty < rawQtyToProcess) {
        const confirmExternal = confirm(
            `Estoque de ${rawStockItem.name} insuficiente (${rawStockItem.qty} no estoque, mas você quer refinar ${rawQtyToProcess}).\n` + 
            `Deseja trazer os ${rawQtyToProcess} materiais brutos "de fora" (externos), adicioná-los e processá-los agora?`
        );
        
        if (confirmExternal) {
            rawStockItem.qty += rawQtyToProcess;
            showToast(`Adicionados ${rawQtyToProcess}x ${rawStockItem.name} ao estoque de entrada.`);
        } else {
            return;
        }
    }
    
    const forgedQtyGenerated = Math.floor(rawQtyToProcess / 2);
    const processedRaw = forgedQtyGenerated * 2;
    
    rawStockItem.qty -= processedRaw;
    forgedStockItem.qty += forgedQtyGenerated;
    
    rawQtyInput.value = 0;
    updateMiningCalcOutput();
    
    const transactionDesc = `Refino: ${processedRaw}x ${rawStockItem.name} → ${forgedQtyGenerated}x ${forgedStockItem.name}`;
    state.transactions.unshift({
        id: 't-refine-' + Date.now(),
        desc: transactionDesc,
        type: 'income',
        category: 'Mineração',
        value: 0,
        date: new Date().toISOString()
    });
    
    showToast(`Sucesso! Refinados ${processedRaw} brutos em ${forgedQtyGenerated} forjados.`);
    updateUI();
}

function renderMiningInventory() {
    const listContainer = document.getElementById('mining-inventory-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const miningItems = state.inventory.filter(item => item.category === 'mineracao');
    
    const baseMaterials = [
        { key: 'ferro', name: 'Ferro', css: 'mat-iron' },
        { key: 'cobre', name: 'Cobre', css: 'mat-copper' },
        { key: 'prata', name: 'Prata', css: 'mat-silver' },
        { key: 'aco', name: 'Aço', css: 'mat-steel' },
        { key: 'titanio', name: 'Titânio', css: 'mat-titanio' }
    ];
    
    baseMaterials.forEach(mat => {
        const raw = miningItems.find(i => i.id === `${mat.key}_bruto`);
        const forged = miningItems.find(i => i.id === `${mat.key}_forjado`);
        
        if (raw && forged) {
            const itemHTML = `
                <div class="material-item ${mat.css}">
                    <div class="material-meta">
                        <div class="material-icon-box">${raw.label}</div>
                        <div>
                            <div class="material-name">${mat.name}</div>
                            <div class="material-sub">2 brutos faz 1 forjado</div>
                        </div>
                    </div>
                    
                    <div class="material-qty-container">
                        <div class="material-qty-box" style="border-right: 1px solid var(--border-color); padding-right: 1rem;">
                            <div class="material-qty">${raw.qty} u.</div>
                            <div class="material-sub" style="text-align: right;">Bruto</div>
                        </div>
                        <div class="material-qty-box">
                            <div class="material-qty" style="color: var(--accent-cyan);">${forged.qty} u.</div>
                            <div class="material-qty-forged">Forjado</div>
                        </div>
                        
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="quickAdjustQty('${raw.id}', 5)">+5</button>
                            <button class="qty-btn" onclick="quickAdjustQty('${raw.id}', -5)">-5</button>
                        </div>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHTML);
        }
    });
}

function quickAdjustQty(itemId, amount) {
    const item = state.inventory.find(i => i.id === itemId);
    if (item) {
        item.qty += amount;
        if (item.qty < 0) item.qty = 0;
        updateUI();
        showToast(`Quantidade de ${item.name} ajustada para ${item.qty} u.`);
    }
}

/* ==========================================================================
   3D PRINTER SECTION LOGIC
   ========================================================================== */

function renderPrinter3D() {
    const borrachaQty = getStockQty('borracha');
    const plasticoQty = getStockQty('plastico');
    const acoLaminaQty = getStockQty('aco_lamina');
    
    const wBorracha = document.getElementById('print-mat-borracha');
    const wPlastico = document.getElementById('print-mat-plastico');
    const wAcoLamina = document.getElementById('print-mat-aco_lamina');
    
    if (wBorracha) wBorracha.textContent = `${borrachaQty} u.`;
    if (wPlastico) wPlastico.textContent = `${plasticoQty} u.`;
    if (wAcoLamina) wAcoLamina.textContent = `${acoLaminaQty} u.`;
    
    const recipesContainer = document.getElementById('printer-recipes-list');
    if (!recipesContainer) return;
    recipesContainer.innerHTML = '';
    
    printerRecipes.forEach(recipe => {
        const currentStock = getStockQty(recipe.id);
        const userXP = state.playerXP || 0;
        const isLocked = !state.bypassXP && userXP < recipe.xp;
        
        let ingredientsHTML = '';
        let canPrint = true;
        
        for (const [matId, reqQty] of Object.entries(recipe.materials)) {
            const stockMat = state.inventory.find(i => i.id === matId);
            const currentMatStock = stockMat ? stockMat.qty : 0;
            const matName = stockMat ? stockMat.name : matId;
            
            const isSufficient = currentMatStock >= reqQty;
            if (!isSufficient) canPrint = false;
            
            const statusClass = isSufficient ? 'sufficient' : 'insufficient';
            ingredientsHTML += `<span class="recipe-ingredient-tag ${statusClass}">${reqQty}x ${matName} (${currentMatStock})</span>`;
        }
        
        const lockIcon = isLocked ? `<i class="ri-lock-line" style="color: var(--accent-pink); margin-right: 4px;"></i>` : '';
        const cardStyle = isLocked ? `opacity: 0.65; border-left-color: var(--accent-pink);` : ``;
        const xpPct = recipe.xp > 0 ? Math.min(100, Math.round((userXP / recipe.xp) * 100)) : 100;
        const xpMissing = recipe.xp - userXP;
        const lockBadge = isLocked
            ? `<span class="slot-status-badge free" style="background: rgba(255,0,127,0.08); color: var(--accent-pink); border-color: rgba(255,0,127,0.25); font-weight:700; display:inline-flex; flex-direction:column; gap:3px; padding: 4px 10px; border-radius: 8px;">
                 <span style="font-size:0.75rem;">🔒 ${userXP} / ${recipe.xp} XP &mdash; faltam <strong>${xpMissing}</strong></span>
                 <span style="display:block; width:120px; height:4px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                   <span style="display:block; width:${xpPct}%; height:100%; background: var(--accent-pink); border-radius:4px;"></span>
                 </span>
               </span>`
            : '';
        const printButton = isLocked
            ? `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; cursor: not-allowed;" disabled><i class="ri-lock-line"></i> Bloqueado</button>`
            : `<button class="btn btn-pink" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="craft3DItem('${recipe.id}')"><i class="ri-play-fill"></i> Imprimir</button>`;
        
        const cardHTML = `
            <div class="printer-card" style="${cardStyle}">
                <div class="printer-card-left">
                    <div class="printer-card-icon-box">
                        <i class="ri-printer-line"></i>
                    </div>
                    <div class="printer-card-info">
                        <h4 style="font-style: italic; display: flex; align-items: center;">${lockIcon} ${recipe.name} &nbsp; ${lockBadge}</h4>
                        <div class="printer-card-meta">
                            Tempo: <strong>${recipe.time}</strong> | Materiais: ${ingredientsHTML}<br>
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-cyan);">${currentStock} u.</strong>
                        </div>
                    </div>
                </div>
                
                <div class="printer-card-actions">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="number" id="print-qty-${recipe.id}" value="1" min="1" style="width: 50px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 4px; border-radius: 4px; text-align: center;" ${isLocked ? 'disabled' : ''}>
                        ${printButton}
                    </div>
                </div>
            </div>
        `;
        recipesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function craft3DItem(recipeId) {
    const recipe = printerRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    // XP check
    const userXP = state.playerXP || 0;
    if (!state.bypassXP && userXP < recipe.xp) {
        showToast(`XP insuficiente! Este item requer ${recipe.xp} XP.`, 'error');
        return;
    }
    
    const qtyInput = document.getElementById(`print-qty-${recipeId}`);
    const multiplier = parseInt(qtyInput.value) || 1;
    
    if (multiplier <= 0) {
        showToast("Insira uma quantidade maior que zero.", "error");
        return;
    }
    
    let missingMats = [];
    for (const [matId, reqQty] of Object.entries(recipe.materials)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        const currentQty = stockItem ? stockItem.qty : 0;
        const totalRequired = reqQty * multiplier;
        if (currentQty < totalRequired) {
            missingMats.push({
                name: stockItem ? stockItem.name : matId,
                missing: totalRequired - currentQty
            });
        }
    }
    
    if (missingMats.length > 0) {
        const missingStr = missingMats.map(m => `${m.missing}x ${m.name}`).join(', ');
        showToast(`Ingredientes insuficientes! Faltando: ${missingStr}`, "error");
        return;
    }
    
    for (const [matId, reqQty] of Object.entries(recipe.materials)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        if (stockItem) {
            stockItem.qty -= reqQty * multiplier;
        }
    }
    
    const productItem = state.inventory.find(i => i.id === recipeId);
    if (productItem) {
        productItem.qty += multiplier;
    } else {
        state.inventory.push({
            id: recipeId,
            name: recipe.name,
            category: 'impressora3d',
            type: 'other',
            qty: multiplier,
            minQty: 5,
            label: recipe.name.substring(0, 2).toUpperCase()
        });
    }
    
    state.transactions.unshift({
        id: 't-print-' + Date.now(),
        desc: `Fabricado (3D): ${multiplier}x ${recipe.name}`,
        type: 'income',
        category: 'Impressora 3D',
        value: 0,
        date: new Date().toISOString()
    });
    
    showToast(`Impresso com sucesso: ${multiplier}x ${recipe.name}!`);
    updateUI();
}

/* ==========================================================================
   COZINHA SECTION LOGIC
   ========================================================================== */

function searchKitchenRecipes() {
    const input = document.getElementById('kitchen-search-input');
    if (input) {
        kitchenSearchQuery = input.value.trim().toLowerCase();
        renderCozinha();
    }
}

function renderCozinha() {
    for (let i = 0; i < 4; i++) {
        const slot = cookingSlots[i];
        const statusBadge = document.getElementById(`slot-status-${i}`);
        const bodyContainer = document.getElementById(`slot-body-${i}`);
        const slotCard = document.getElementById(`kitchen-slot-${i}`);
        
        if (!statusBadge || !bodyContainer || !slotCard) continue;
        
        if (slot.itemId === null) {
            statusBadge.className = 'slot-status-badge free';
            statusBadge.textContent = 'Livre';
            slotCard.classList.remove('cooking');
            bodyContainer.innerHTML = `<span class="slot-empty-text">—</span>`;
        } else {
            statusBadge.className = 'slot-status-badge cooking';
            statusBadge.textContent = 'Preparo';
            slotCard.classList.add('cooking');
            
            const pct = Math.min(100, Math.floor((slot.elapsed / slot.duration) * 100));
            const remaining = Math.max(0, slot.duration - slot.elapsed);
            
            bodyContainer.innerHTML = `
                <div class="slot-item-name">${slot.qty}x ${slot.itemName}</div>
                <div class="slot-progress-container">
                    <div class="slot-time-text">
                        <span>Restam: ${remaining}s</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="slot-progress-bar">
                        <div class="slot-progress-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }
    }
    
    const recipesContainer = document.getElementById('kitchen-recipes-list');
    if (!recipesContainer) return;
    recipesContainer.innerHTML = '';
    
    const filteredRecipes = kitchenRecipes.filter(r => 
        r.name.toLowerCase().includes(kitchenSearchQuery)
    );
    
    if (filteredRecipes.length === 0) {
        recipesContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma receita encontrada para "${kitchenSearchQuery}".</div>`;
        return;
    }
    
    filteredRecipes.forEach(recipe => {
        const currentStock = getStockQty(recipe.id);
        
        let ingredientsHTML = '';
        let canPrepare = true;
        
        for (const [matId, reqQty] of Object.entries(recipe.ingredients)) {
            const stockMat = state.inventory.find(i => i.id === matId);
            const currentMatStock = stockMat ? stockMat.qty : 0;
            const matName = stockMat ? stockMat.name : matId;
            
            const isSufficient = currentMatStock >= reqQty;
            if (!isSufficient) canPrepare = false;
            
            const statusClass = isSufficient ? 'sufficient' : 'insufficient';
            ingredientsHTML += `<span class="recipe-ingredient-tag ${statusClass}">${reqQty}x ${matName} (${currentMatStock})</span>`;
        }
        
        const cardHTML = `
            <div class="kitchen-recipe-card">
                <div>
                    <div class="kitchen-recipe-header">
                        <h4 class="kitchen-recipe-title">${recipe.name}</h4>
                    </div>
                    <div class="kitchen-recipe-body">
                        Ingredientes: <div style="margin: 0.25rem 0;">${ingredientsHTML}</div>
                        No estoque: <strong style="color: var(--accent-pink);">${currentStock} u.</strong>
                    </div>
                </div>
                
                <div class="kitchen-recipe-actions">
                    <input type="number" id="kitchen-qty-${recipe.id}" class="qty-input" value="1" min="1">
                    <button class="btn-preparar" onclick="startCookingProcess('${recipe.id}')">
                        <i class="ri-fire-fill"></i> Preparar
                    </button>
                </div>
            </div>
        `;
        recipesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function startCookingProcess(recipeId) {
    const recipe = kitchenRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const qtyInput = document.getElementById(`kitchen-qty-${recipeId}`);
    const multiplier = parseInt(qtyInput.value) || 1;
    
    if (multiplier <= 0) {
        showToast("Insira uma quantidade maior que zero.", "error");
        return;
    }
    
    let missingIngredients = [];
    for (const [matId, reqQty] of Object.entries(recipe.ingredients)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        const currentQty = stockItem ? stockItem.qty : 0;
        const totalRequired = reqQty * multiplier;
        if (currentQty < totalRequired) {
            missingIngredients.push({
                name: stockItem ? stockItem.name : matId,
                missing: totalRequired - currentQty
            });
        }
    }
    
    if (missingIngredients.length > 0) {
        const missingStr = missingIngredients.map(m => `${m.missing}x ${m.name}`).join(', ');
        showToast(`Ingredientes insuficientes! Faltando: ${missingStr}`, "error");
        return;
    }
    
    const freeSlotIndex = cookingSlots.findIndex(s => s.itemId === null);
    if (freeSlotIndex === -1) {
        showToast("Fila de preparo cheia! Aguarde a conclusão de algum slot.", "error");
        return;
    }
    
    for (const [matId, reqQty] of Object.entries(recipe.ingredients)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        if (stockItem) {
            stockItem.qty -= reqQty * multiplier;
        }
    }
    
    const slot = cookingSlots[freeSlotIndex];
    slot.itemId = recipe.id;
    slot.itemName = recipe.name;
    slot.qty = multiplier;
    slot.duration = recipe.time; 
    slot.elapsed = 0;
    
    showToast(`Iniciado preparo de ${multiplier}x ${recipe.name} no Slot ${freeSlotIndex + 1}!`);
    renderCozinha();
    updateUI(); 
    
    slot.intervalId = setInterval(() => {
        slot.elapsed += 1;
        
        if (slot.elapsed >= slot.duration) {
            clearInterval(slot.intervalId);
            slot.intervalId = null;
            
            const finalQty = recipe.resultQty * slot.qty;
            const stockItem = state.inventory.find(i => i.id === slot.itemId);
            if (stockItem) {
                stockItem.qty += finalQty;
            } else {
                state.inventory.push({
                    id: slot.itemId,
                    name: slot.itemName,
                    category: 'cozinha',
                    type: 'other',
                    qty: finalQty,
                    minQty: 5,
                    label: slot.itemName.substring(0, 2).toUpperCase()
                });
            }
            
            state.transactions.unshift({
                id: 't-cook-' + Date.now(),
                desc: `Cozinhado: ${finalQty}x ${slot.itemName}`,
                type: 'income',
                category: 'Cozinha',
                value: 0,
                date: new Date().toISOString()
            });
            
            showToast(`Concluído: ${finalQty}x ${slot.itemName} pronto(s) para entrega!`, 'success');
            
            slot.itemId = null;
            slot.itemName = null;
            slot.qty = 0;
            slot.duration = 0;
            slot.elapsed = 0;
            
            updateUI();
        } else {
            renderCozinha();
        }
    }, 1000);
}

/* ==========================================================================
   MOINHO DE REFINO SECTION LOGIC
   ========================================================================== */

function renderMoinho() {
    const borrachaBrutaQty = getStockQty('borracha_bruta');
    const cobreQty = getStockQty('cobre_forjado');
    const ferroQty = getStockQty('ferro_forjado');
    const acoQty = getStockQty('aco_forjado');
    
    const wBorrachaBruta = document.getElementById('moinho-mat-borracha_bruta');
    const wCobre = document.getElementById('moinho-mat-cobre_forjado');
    const wFerro = document.getElementById('moinho-mat-ferro_forjado');
    const wAco = document.getElementById('moinho-mat-aco_forjado');
    
    if (wBorrachaBruta) wBorrachaBruta.textContent = `${borrachaBrutaQty} u.`;
    if (wCobre) wCobre.textContent = `${cobreQty} u.`;
    if (wFerro) wFerro.textContent = `${ferroQty} u.`;
    if (wAco) wAco.textContent = `${acoQty} u.`;
    
    const recipesContainer = document.getElementById('moinho-recipes-list');
    if (!recipesContainer) return;
    recipesContainer.innerHTML = '';
    
    moinhoRecipes.forEach(recipe => {
        const currentStock = getStockQty(recipe.id);
        const userXP = state.playerXP || 0;
        const isLocked = !state.bypassXP && userXP < recipe.xp;
        
        let ingredientsHTML = '';
        let canRefine = true;
        
        for (const [matId, reqQty] of Object.entries(recipe.materials)) {
            const stockMat = state.inventory.find(i => i.id === matId);
            const currentMatStock = stockMat ? stockMat.qty : 0;
            const matName = stockMat ? stockMat.name : matId;
            
            const isSufficient = currentMatStock >= reqQty;
            if (!isSufficient) canRefine = false;
            
            const statusClass = isSufficient ? 'sufficient' : 'insufficient';
            ingredientsHTML += `<span class="recipe-ingredient-tag ${statusClass}">${reqQty}x ${matName} (${currentMatStock})</span>`;
        }
        
        const lockIcon = isLocked ? `<i class="ri-lock-line" style="color: var(--accent-orange); margin-right: 4px;"></i>` : '';
        const cardStyle = isLocked ? `opacity: 0.65; border-left-color: var(--accent-orange);` : `border-left-color: var(--accent-orange);`;
        const xpPct = recipe.xp > 0 ? Math.min(100, Math.round((userXP / recipe.xp) * 100)) : 100;
        const xpMissing = recipe.xp - userXP;
        const lockBadge = isLocked
            ? `<span class="slot-status-badge free" style="background: rgba(255,94,0,0.08); color: var(--accent-orange); border-color: rgba(255,94,0,0.25); font-weight:700; display:inline-flex; flex-direction:column; gap:3px; padding: 4px 10px; border-radius: 8px;">
                 <span style="font-size:0.75rem;">🔒 ${userXP} / ${recipe.xp} XP &mdash; faltam <strong>${xpMissing}</strong></span>
                 <span style="display:block; width:120px; height:4px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                   <span style="display:block; width:${xpPct}%; height:100%; background: var(--accent-orange); border-radius:4px;"></span>
                 </span>
               </span>`
            : '';
        const refineButton = isLocked
            ? `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; cursor: not-allowed;" disabled><i class="ri-lock-line"></i> Bloqueado</button>`
            : `<button class="btn btn-orange" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="craftMoinhoItem('${recipe.id}')"><i class="ri-refresh-line"></i> Refinar</button>`;
        
        const cardHTML = `
            <div class="printer-card" style="${cardStyle}">
                <div class="printer-card-left">
                    <div class="printer-card-icon-box" style="background: rgba(255, 94, 0, 0.07); border-color: rgba(255, 94, 0, 0.15); color: var(--accent-orange); filter: drop-shadow(0 0 4px rgba(255, 94, 0, 0.3));">
                        <i class="ri-factory-line"></i>
                    </div>
                    <div class="printer-card-info">
                        <h4 style="font-style: italic; display: flex; align-items: center;">${lockIcon} ${recipe.name} &nbsp; ${lockBadge}</h4>
                        <div class="printer-card-meta">
                            Tempo: <strong>${recipe.time}</strong> | Materiais: ${ingredientsHTML}<br>
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-orange);">${currentStock} u.</strong>
                        </div>
                    </div>
                </div>
                
                <div class="printer-card-actions">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="number" id="moinho-qty-${recipe.id}" value="1" min="1" style="width: 50px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 4px; border-radius: 4px; text-align: center;" ${isLocked ? 'disabled' : ''}>
                        ${refineButton}
                    </div>
                </div>
            </div>
        `;
        recipesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function craftMoinhoItem(recipeId) {
    const recipe = moinhoRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    // XP check
    const userXP = state.playerXP || 0;
    if (!state.bypassXP && userXP < recipe.xp) {
        showToast(`XP insuficiente! Este item requer ${recipe.xp} XP.`, 'error');
        return;
    }
    
    const qtyInput = document.getElementById(`moinho-qty-${recipeId}`);
    const multiplier = parseInt(qtyInput.value) || 1;
    
    if (multiplier <= 0) {
        showToast("Insira uma quantidade maior que zero.", "error");
        return;
    }
    
    let missingMats = [];
    for (const [matId, reqQty] of Object.entries(recipe.materials)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        const currentQty = stockItem ? stockItem.qty : 0;
        const totalRequired = reqQty * multiplier;
        if (currentQty < totalRequired) {
            missingMats.push({
                name: stockItem ? stockItem.name : matId,
                missing: totalRequired - currentQty
            });
        }
    }
    
    if (missingMats.length > 0) {
        const missingStr = missingMats.map(m => `${m.missing}x ${m.name}`).join(', ');
        showToast(`Ingredientes insuficientes! Faltando: ${missingStr}`, "error");
        return;
    }
    
    for (const [matId, reqQty] of Object.entries(recipe.materials)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        if (stockItem) {
            stockItem.qty -= reqQty * multiplier;
        }
    }
    
    const productItem = state.inventory.find(i => i.id === recipeId);
    if (productItem) {
        productItem.qty += multiplier;
    } else {
        state.inventory.push({
            id: recipeId,
            name: recipe.name,
            category: 'moinho',
            type: 'other',
            qty: multiplier,
            minQty: 5,
            label: recipe.name.substring(0, 2).toUpperCase()
        });
    }
    
    state.transactions.unshift({
        id: 't-moinho-' + Date.now(),
        desc: `Refinado (Moinho): ${multiplier}x ${recipe.name}`,
        type: 'income',
        category: 'Moinho de Refino',
        value: 0,
        date: new Date().toISOString()
    });
    
    showToast(`Moagem concluída: ${multiplier}x ${recipe.name}!`);
    updateUI();
}

/* ==========================================================================
   IMPRESSORA INDUSTRIAL DE PÓ SECTION LOGIC
   ========================================================================== */

// Toggle Admin Bypass checkbox
function toggleXPBypass() {
    const checkbox = document.getElementById('bypass-xp-checkbox');
    if (checkbox) {
        state.bypassXP = checkbox.checked;
        updateUI();
        showToast(state.bypassXP ? "Modo Admin Ativado: XP de refino ignorado!" : "Modo Admin Desativado: XP exigido reativado.", "warning");
    }
}

// Render Industrial Powder Printer Section
function renderPrinterPo() {
    // 1. Update Base Materials widgets
    const poAluminioQty = getStockQty('po_aluminio');
    const poAcoQty = getStockQty('po_aco');
    const fioCobreQty = getStockQty('fio_cobre');
    const pecasArmaQty = getStockQty('pecas_arma');
    
    const wAluminio = document.getElementById('po-mat-aluminio');
    const wAco = document.getElementById('po-mat-aco');
    const wCobre = document.getElementById('po-mat-cobre');
    const wPecasArma = document.getElementById('po-mat-pecas_arma');
    const checkbox = document.getElementById('bypass-xp-checkbox');
    
    if (wAluminio) wAluminio.textContent = `${poAluminioQty} u.`;
    if (wAco) wAco.textContent = `${poAcoQty} u.`;
    if (wCobre) wCobre.textContent = `${fioCobreQty} u.`;
    if (wPecasArma) wPecasArma.textContent = `${pecasArmaQty} u.`;
    if (checkbox) checkbox.checked = state.bypassXP;
    
    // 2. Render Recipes
    const recipesContainer = document.getElementById('po-recipes-list');
    if (!recipesContainer) return;
    recipesContainer.innerHTML = '';
    
    const userXP = state.playerXP || 0;
    
    poRecipes.forEach(recipe => {
        const currentStock = getStockQty(recipe.id);
        const isLocked = !state.bypassXP && userXP < recipe.xp;
        
        let ingredientsHTML = '';
        let canPrint = true;
        
        for (const [matId, reqQty] of Object.entries(recipe.materials)) {
            const stockMat = state.inventory.find(i => i.id === matId);
            const currentMatStock = stockMat ? stockMat.qty : 0;
            const matName = stockMat ? stockMat.name : matId;
            
            const isSufficient = currentMatStock >= reqQty;
            if (!isSufficient) canPrint = false;
            
            const statusClass = isSufficient ? 'sufficient' : 'insufficient';
            ingredientsHTML += `<span class="recipe-ingredient-tag ${statusClass}">${reqQty}x ${matName} (${currentMatStock})</span>`;
        }
        
        const lockIcon = isLocked ? `<i class="ri-lock-line" style="color: var(--accent-red); margin-right: 4px;"></i>` : '';
        const cardStyle = isLocked ? `opacity: 0.65; border-left-color: var(--accent-red);` : `border-left-color: var(--accent-red);`;
        const xpPct = recipe.xp > 0 ? Math.min(100, Math.round((userXP / recipe.xp) * 100)) : 100;
        const xpMissing = recipe.xp - userXP;
        const lockBadge = isLocked
            ? `<span class="slot-status-badge free" style="background: rgba(255,51,51,0.08); color: var(--accent-red); border-color: rgba(255,51,51,0.25); font-weight:700; display:inline-flex; flex-direction:column; gap:3px; padding: 4px 10px; border-radius: 8px;">
                 <span style="font-size:0.75rem;">🔒 ${userXP} / ${recipe.xp} XP &mdash; faltam <strong>${xpMissing}</strong></span>
                 <span style="display:block; width:120px; height:4px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                   <span style="display:block; width:${xpPct}%; height:100%; background: var(--accent-red); border-radius:4px;"></span>
                 </span>
               </span>`
            : '';
        const printButton = isLocked
            ? `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; cursor: not-allowed;" disabled><i class="ri-lock-line"></i> Bloqueado</button>`
            : `<button class="btn btn-orange" style="background: linear-gradient(135deg, var(--accent-red), #cc0000); color: #fff; box-shadow: 0 4px 10px rgba(255,51,51,0.2); padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="craftPoItem('${recipe.id}')"><i class="ri-cpu-line"></i> Sinterizar</button>`;
        
        const cardHTML = `
            <div class="printer-card" style="${cardStyle}">
                <div class="printer-card-left">
                    <div class="printer-card-icon-box" style="background: rgba(255, 51, 51, 0.07); border-color: rgba(255, 51, 51, 0.15); color: var(--accent-red); filter: drop-shadow(0 0 4px rgba(255, 51, 51, 0.3));">
                        <i class="ri-cpu-line"></i>
                    </div>
                    <div class="printer-card-info">
                        <h4 style="font-style: italic; display: flex; align-items: center;">${lockIcon} ${recipe.name} &nbsp; ${lockBadge}</h4>
                        <div class="printer-card-meta">
                            Tempo: <strong>${recipe.time}</strong> | Materiais: ${ingredientsHTML}<br>
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-red);">${currentStock} u.</strong>
                        </div>
                    </div>
                </div>
                
                <div class="printer-card-actions">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="number" id="po-qty-${recipe.id}" value="1" min="1" style="width: 50px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 4px; border-radius: 4px; text-align: center;" ${isLocked ? 'disabled' : ''}>
                        ${printButton}
                    </div>
                </div>
            </div>
        `;
        recipesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function craftPoItem(recipeId) {
    const recipe = poRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    // Check lock again to prevent console hacking if Admin Mode is OFF
    const userXP = state.playerXP || 0;
    if (!state.bypassXP && userXP < recipe.xp) {
        showToast("Seu XP é insuficiente para este item.", "error");
        return;
    }
    
    const qtyInput = document.getElementById(`po-qty-${recipeId}`);
    const multiplier = parseInt(qtyInput.value) || 1;
    
    if (multiplier <= 0) {
        showToast("Insira uma quantidade maior que zero.", "error");
        return;
    }
    
    // Check ingredient availability
    let missingMats = [];
    for (const [matId, reqQty] of Object.entries(recipe.materials)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        const currentQty = stockItem ? stockItem.qty : 0;
        const totalRequired = reqQty * multiplier;
        if (currentQty < totalRequired) {
            missingMats.push({
                name: stockItem ? stockItem.name : matId,
                missing: totalRequired - currentQty
            });
        }
    }
    
    if (missingMats.length > 0) {
        const missingStr = missingMats.map(m => `${m.missing}x ${m.name}`).join(', ');
        showToast(`Ingredientes insuficientes! Faltando: ${missingStr}`, "error");
        return;
    }
    
    // Deduct ingredients
    for (const [matId, reqQty] of Object.entries(recipe.materials)) {
        const stockItem = state.inventory.find(i => i.id === matId);
        if (stockItem) {
            stockItem.qty -= reqQty * multiplier;
        }
    }
    
    // Add product to inventory
    const productItem = state.inventory.find(i => i.id === recipeId);
    if (productItem) {
        productItem.qty += multiplier;
    } else {
        state.inventory.push({
            id: recipeId,
            name: recipe.name,
            category: 'impressorapo',
            type: 'other',
            qty: multiplier,
            minQty: 5,
            label: recipe.name.substring(0, 2).toUpperCase()
        });
    }
    
    // Log financial transaction (0 cost)
    state.transactions.unshift({
        id: 't-po-' + Date.now(),
        desc: `Sinterizado (DMLS): ${multiplier}x ${recipe.name}`,
        type: 'income',
        category: 'Imp. Industrial de Pó',
        value: 0,
        date: new Date().toISOString()
    });
    
    showToast(`Sinterização concluída: ${multiplier}x ${recipe.name}!`);
    updateUI();
}

/* ==========================================================================
   FINANCE SECTION LOGIC
   ========================================================================== */

function addTransaction(event) {
    event.preventDefault();
    
    const desc = document.getElementById('t-desc').value.trim();
    const type = document.getElementById('t-type').value;
    const category = document.getElementById('t-category').value;
    const value = parseFloat(document.getElementById('t-value').value) || 0;
    
    if (value <= 0) {
        showToast("Insira um valor válido e positivo.", "error");
        return;
    }
    
    const newTransaction = {
        id: 't-' + Date.now(),
        desc: desc,
        type: type,
        category: category,
        value: value,
        date: new Date().toISOString()
    };
    
    state.transactions.unshift(newTransaction);
    
    if (type === 'income') {
        state.balance += value;
    } else {
        state.balance -= value;
    }
    
    document.getElementById('transaction-form').reset();
    showToast(`Transação "${desc}" registrada!`);
    updateUI();
}

function deleteTransaction(id) {
    const index = state.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        const trans = state.transactions[index];
        
        if (trans.type === 'income') {
            state.balance -= trans.value;
        } else {
            state.balance += trans.value;
        }
        
        state.transactions.splice(index, 1);
        showToast(`Lançamento "${trans.desc}" removido.`, "warning");
        updateUI();
    }
}

function clearTransactions() {
    if (confirm("Tem certeza que deseja apagar todo o histórico de transações financeiras?")) {
        state.transactions = [];
        state.balance = 0;
        showToast("Histórico financeiro limpo.", "warning");
        updateUI();
    }
}

function renderRecentTransactions() {
    const tbody = document.getElementById('dash-transactions-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const recents = state.transactions.slice(0, 4);
    
    if (recents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Nenhuma transação lançada.</td></tr>`;
        return;
    }
    
    recents.forEach(t => {
        const isExpense = t.type === 'expense';
        const typeBadge = isExpense 
            ? `<span class="badge-expense">Saída</span>` 
            : `<span class="badge-income">Entrada</span>`;
        const valColor = isExpense ? 'var(--accent-pink)' : 'var(--accent-green)';
        const prefix = isExpense ? '-' : '+';
        
        const row = `
            <tr>
                <td style="font-weight: 500;">${t.desc}</td>
                <td>${typeBadge}</td>
                <td style="color: ${valColor}; font-weight: 700; font-family: var(--font-display);">${prefix} R$ ${t.value.toFixed(2)}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function renderTransactionsTable() {
    const tbody = document.getElementById('transactions-table-body');
    const emptyState = document.getElementById('no-transactions');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (state.transactions.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
    }
    
    state.transactions.forEach(t => {
        const isExpense = t.type === 'expense';
        const typeBadge = isExpense 
            ? `<span class="badge-expense">Saída</span>` 
            : `<span class="badge-income">Entrada</span>`;
        const valColor = isExpense ? 'var(--accent-pink)' : 'var(--accent-green)';
        const prefix = isExpense ? '-' : '+';
        const dateFormatted = new Date(t.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const row = `
            <tr>
                <td>${dateFormatted}</td>
                <td style="font-weight: 600;">${t.desc}</td>
                <td>${typeBadge}</td>
                <td><span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px;">${t.category}</span></td>
                <td style="color: ${valColor}; font-weight: 700; font-family: var(--font-display);">${prefix} R$ ${t.value.toFixed(2)}</td>
                <td>
                    <button class="delete-btn" onclick="deleteTransaction('${t.id}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

/* ==========================================================================
   STOCK & INVENTORY LOGIC
   ========================================================================== */

function filterStock(categoryFilter) {
    state.currentFilter = categoryFilter;
    
    const filters = ['all', 'raw', 'forged', 'other'];
    filters.forEach(f => {
        const btn = document.getElementById(`filter-btn-${f}`);
        if (btn) {
            if (f === categoryFilter) {
                btn.style.background = 'rgba(0, 240, 255, 0.1)';
                btn.style.borderColor = 'var(--accent-cyan)';
                btn.style.color = 'var(--accent-cyan)';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.04)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-primary)';
            }
        }
    });
    
    renderStockTable();
}

function renderStockTable() {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let filteredItems = state.inventory;
    if (state.currentFilter === 'raw') {
        filteredItems = state.inventory.filter(item => item.type === 'raw');
    } else if (state.currentFilter === 'forged') {
        filteredItems = state.inventory.filter(item => item.type === 'forged');
    } else if (state.currentFilter === 'other') {
        filteredItems = state.inventory.filter(item => item.category !== 'mineracao');
    }
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum item cadastrado nesta categoria.</td></tr>`;
        return;
    }
    
    filteredItems.forEach(item => {
        const percentage = Math.min(100, Math.floor((item.qty / item.minQty) * 100)) || 0;
        let progressClass = 'high';
        if (percentage < 35) {
            progressClass = 'low';
        } else if (percentage < 75) {
            progressClass = 'medium';
        }
        
        const categoryBadge = `<span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px;">${item.category}</span>`;
        const typeBadge = item.type === 'raw' 
            ? `<span style="color: var(--accent-orange);">Bruto</span>` 
            : item.type === 'forged' 
                ? `<span style="color: var(--accent-cyan);">Forjado</span>` 
                : `<span style="color: var(--text-muted);">Pronto</span>`;
                
        const isDefaultMining = ['ferro_bruto', 'ferro_forjado', 'cobre_bruto', 'cobre_forjado', 'prata_bruto', 'prata_forjado', 'aco_bruto', 'aco_forjado', 'titanio_bruto', 'titanio_forjado'].includes(item.id);
        const isDefault3D = ['borracha', 'plastico', 'aco_lamina', 'base_ecu', 'caixa_filtro_esportiva', 'caixa_fusiveis', 'carcaca_ecu_ecumaster', 'carcaca_ecu_octtane', 'carcaca_sensor', 'duto_admissao', 'duto_intercooler', 'faca_simples', 'moldura_filtro', 'suporte_ecu'].includes(item.id);
        const isDefaultKitchen = ['milho', 'trigo', 'alface', 'tomate', 'frutas', 'feijao', 'arroz', 'batata', 'agua', 'grao_cafe', 'pao_milho', 'pipoca', 'salada', 'salada_frutas', 'feijao_arroz', 'batata_cozida', 'batata_frita', 'cafe', 'sanduiche', 'burger'].includes(item.id);
        const isDefaultMoinho = ['borracha_bruta', 'fio_cobre', 'po_aluminio', 'po_aco'].includes(item.id);
        const isDefaultPo = ['pecas_arma', 'bloco_bruto_aluminio', 'bloco_bruto_ferro', 'cabecote_bruto', 'caixa_lateral_intercooler', 'carcaca_cambio_bruta', 'carcaca_diferencial_bruta', 'carcaca_turbo_media', 'carcaca_turbo_pequena', 'carcaca_turbo_race', 'coletor_escape_bruto', 'comando_bruto', 'conjunto_pecas_pistola', 'corpo_borboleta_bruto', 'flauta_combustivel_bruta', 'molde_biela_usinada', 'molde_pistao_usinado', 'nucleo_bruto_intercooler', 'nucleo_bruto_radiador', 'rotor_compressor', 'virabrequim_bruto', 'volante_motor_bruto'].includes(item.id);
        const isFixo = isDefaultMining || isDefault3D || isDefaultKitchen || isDefaultMoinho || isDefaultPo;
        
        const actionBtn = isFixo 
            ? `<span style="color: var(--text-muted); font-size: 0.8rem;">Fixo</span>`
            : `<button class="delete-btn" onclick="deleteStockItem('${item.id}')"><i class="ri-delete-bin-line"></i></button>`;
        
        const row = `
            <tr>
                <td style="font-weight: 600;">${item.name}</td>
                <td>${categoryBadge}</td>
                <td>${typeBadge}</td>
                <td style="font-family: var(--font-display); font-weight: 700; font-size: 1.1rem;">${item.qty} u.</td>
                <td>
                    <div class="stock-level-container">
                        <div class="stock-level-label-row">
                            <span>Mínimo: ${item.minQty}</span>
                            <span>${percentage}%</span>
                        </div>
                        <div class="stock-progress-bar">
                            <div class="stock-progress-fill ${progressClass}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="number" value="${item.qty}" min="0" onchange="updateStockDirectQty('${item.id}', this.value)" style="width: 60px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 4px; border-radius: 4px; text-align: center;">
                        <button class="qty-btn" onclick="adjustStockQty('${item.id}', 1)"><i class="ri-add-line"></i></button>
                        <button class="qty-btn" onclick="adjustStockQty('${item.id}', -1)"><i class="ri-subtract-line"></i></button>
                    </div>
                </td>
                <td style="text-align: center;">
                    ${actionBtn}
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function adjustStockQty(itemId, amount) {
    const item = state.inventory.find(i => i.id === itemId);
    if (item) {
        item.qty += amount;
        if (item.qty < 0) item.qty = 0;
        updateUI();
    }
}

function updateStockDirectQty(itemId, value) {
    const item = state.inventory.find(i => i.id === itemId);
    const parsed = parseInt(value);
    if (item && !isNaN(parsed) && parsed >= 0) {
        item.qty = parsed;
        updateUI();
    }
}

function addCustomStockItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('item-name').value.trim();
    const category = document.getElementById('item-category').value;
    const qty = parseInt(document.getElementById('item-qty').value) || 0;
    const minQty = parseInt(document.getElementById('item-min').value) || 10;
    
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (state.inventory.find(item => item.id === id || item.name.toLowerCase() === name.toLowerCase())) {
        showToast("Este item já está cadastrado no estoque.", "error");
        return;
    }
    
    const newItem = {
        id: id,
        name: name,
        category: category,
        type: 'other',
        qty: qty,
        minQty: minQty,
        label: name.substring(0,2).toUpperCase()
    };
    
    state.inventory.push(newItem);
    document.getElementById('custom-item-form').reset();
    showToast(`Item "${name}" cadastrado com sucesso!`);
    updateUI();
}

function deleteStockItem(id) {
    const index = state.inventory.findIndex(item => item.id === id);
    if (index !== -1) {
        const item = state.inventory[index];
        if (confirm(`Tem certeza que deseja excluir o item "${item.name}" do estoque?`)) {
            state.inventory.splice(index, 1);
            showToast(`Item "${item.name}" excluído.`, "warning");
            updateUI();
        }
    }
}

function renderLowStockAlerts() {
    const listContainer = document.getElementById('dash-low-stock-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const lowStockItems = state.inventory.filter(item => item.qty < item.minQty);
    
    if (lowStockItems.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="padding: 1.5rem 0;">
                <i class="ri-check-double-fill" style="font-size: 2rem; color: var(--accent-green); opacity: 0.8;"></i>
                <p style="font-size: 0.85rem;">Estoque ideal. Nenhum item crítico!</p>
            </div>
        `;
        return;
    }
    
    lowStockItems.forEach(item => {
        const percentage = Math.min(100, Math.floor((item.qty / item.minQty) * 100)) || 0;
        let color = 'var(--accent-red)';
        if (percentage > 35) {
            color = 'var(--accent-orange)';
        }
        
        const html = `
            <div class="material-item" style="padding: 0.65rem 1rem;">
                <div class="material-meta" style="gap: 0.75rem;">
                    <div class="material-icon-box" style="width: 32px; height: 32px; font-size: 0.9rem; background: rgba(255, 51, 51, 0.05); color: ${color}; border-color: rgba(255, 51, 51, 0.15);">${item.label || 'IT'}</div>
                    <div>
                        <div class="material-name" style="font-size: 0.95rem;">${item.name}</div>
                        <div class="material-sub" style="font-size: 0.7rem;">Meta: ${item.minQty} u.</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: ${color};">${item.qty} u.</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted);">${percentage}% da meta</div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    });
}

// Global Search Items Data
const globalSearchItems = [
    // Mining
    { name: 'Ferro Forjado', section: 'mineracao', label: 'Mineração' },
    { name: 'Cobre Forjado', section: 'mineracao', label: 'Mineração' },
    { name: 'Prata Forjado', section: 'mineracao', label: 'Mineração' },
    { name: 'Aço Forjado', section: 'mineracao', label: 'Mineração' },
    { name: 'Titânio Forjado', section: 'mineracao', label: 'Mineração' },
    
    // Cozinha
    { name: 'Pão de Milho', section: 'cozinha', label: 'Cozinha' },
    { name: 'Pipoca', section: 'cozinha', label: 'Cozinha' },
    { name: 'Salada', section: 'cozinha', label: 'Cozinha' },
    { name: 'Salada de Frutas', section: 'cozinha', label: 'Cozinha' },
    { name: 'Feijão e Arroz', section: 'cozinha', label: 'Cozinha' },
    { name: 'Batata Cozida', section: 'cozinha', label: 'Cozinha' },
    { name: 'Batata Frita', section: 'cozinha', label: 'Cozinha' },
    { name: 'Café', section: 'cozinha', label: 'Cozinha' },
    { name: 'Sanduíche', section: 'cozinha', label: 'Cozinha' },
    { name: 'Burger', section: 'cozinha', label: 'Cozinha' },

    // Impressora 3D
    { name: 'Base de ECU', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Caixa de Filtro Esportiva', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Caixa de Fusíveis', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Carcaça ECU Ecumaster', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Carcaça ECU Octtane', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Carcaça de Sensor', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Duto de Admissão', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Duto de Intercooler', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Faca Simples', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Moldura de Filtro', section: 'impressora3d', label: 'Impressora 3D' },
    { name: 'Suporte de ECU', section: 'impressora3d', label: 'Impressora 3D' },

    // Moinho
    { name: 'Composto de Borracha', section: 'moinho', label: 'Moinho de Refino' },
    { name: 'Fio de Cobre', section: 'moinho', label: 'Moinho de Refino' },
    { name: 'Pó de Alumínio', section: 'moinho', label: 'Moinho de Refino' },
    { name: 'Pó de Aço', section: 'moinho', label: 'Moinho de Refino' },

    // Impressora Industrial de Pó
    { name: 'Bloco Bruto de Alumínio', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Bloco Bruto de Ferro', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Cabeçote Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Caixa Lateral de Intercooler', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Carcaça de Câmbio Bruta', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Carcaça de Diferencial Bruta', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Carcaça de Turbo Média', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Carcaça de Turbo Pequena', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Carcaça de Turbo Race', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Coletor de Escape Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Comando Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Conjunto de Peças de Pistola', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Corpo de Borboleta Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Flauta de Combustível Bruta', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Molde de Biela Usinada', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Molde de Pistão Usinado', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Núcleo Bruto de Intercooler', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Núcleo Bruto de Radiador', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Rotor Compressor', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Virabrequim Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    { name: 'Volante de Motor Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' }
];

// Handles the global search input changes
function handleGlobalSearch() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-dropdown');
    if (!input || !dropdown) return;
    
    const query = input.value.trim().toLowerCase();
    if (query === "") {
        dropdown.innerHTML = '';
        dropdown.classList.remove('active');
        return;
    }
    
    const filtered = globalSearchItems.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.label.toLowerCase().includes(query)
    );
    
    dropdown.classList.add('active');
    dropdown.innerHTML = '';
    
    if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="global-search-no-results">Nenhum item ou receita encontrado</div>`;
        return;
    }
    
    filtered.forEach(item => {
        const itemHTML = `
            <div class="global-search-item" onclick="navigateToSearchItem('${item.section}', '${item.name}')">
                <span class="global-search-item-name">${item.name}</span>
                <span class="global-search-item-tag tag-${item.section}">${item.label}</span>
            </div>
        `;
        dropdown.insertAdjacentHTML('beforeend', itemHTML);
    });
}

function showSearchDropdown() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-dropdown');
    if (input && input.value.trim() !== "" && dropdown) {
        dropdown.classList.add('active');
    }
}

function hideSearchDropdownDelayed() {
    setTimeout(() => {
        const dropdown = document.getElementById('global-search-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }, 250);
}

function navigateToSearchItem(sectionId, itemName) {
    // 1. Switch to the target tab
    switchSection(sectionId);
    
    // 2. Clear input and dropdown
    const input = document.getElementById('global-search-input');
    if (input) input.value = '';
    const dropdown = document.getElementById('global-search-dropdown');
    if (dropdown) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('active');
    }
    
    // 3. Highlight the specific recipe or item card in the view
    setTimeout(() => {
        // Find the card containing the item name (using case-insensitive matches)
        let cards = document.querySelectorAll('.printer-card, .kitchen-recipe-card, .material-item');
        let matchedCard = null;
        
        cards.forEach(card => {
            const textContent = card.innerText || card.textContent || "";
            if (textContent.toLowerCase().includes(itemName.toLowerCase())) {
                matchedCard = card;
            }
        });
        
        if (matchedCard) {
            // Scroll matched card into view smoothly
            matchedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add flash animation class
            matchedCard.classList.remove('search-flash');
            void matchedCard.offsetWidth; // Trigger reflow to restart animation
            matchedCard.classList.add('search-flash');
            
            // Remove flash animation class after it completes to keep clean styling
            setTimeout(() => {
                matchedCard.classList.remove('search-flash');
            }, 2000);
        }
    }, 200);
}

// Ores Purchase Calculator System
function calculateMineralBuyTotal() {
    const inputs = document.querySelectorAll('.mineral-buy-input');
    let totalItems = 0;
    let totalCost = 0;
    
    inputs.forEach(input => {
        const qty = Math.max(0, parseInt(input.value) || 0);
        // Force the input value to be non-negative in the UI too
        if (input.value !== '' && qty !== parseInt(input.value)) {
            input.value = qty;
        }
        
        const price = parseFloat(input.dataset.price) || 0;
        const subtotal = qty * price;
        totalItems += qty;
        totalCost += subtotal;
        
        const subtotalEl = document.getElementById(`buy-subtotal-${input.id.replace('buy-qty-', '')}`);
        if (subtotalEl) {
            subtotalEl.innerText = formatCurrency(subtotal);
        }
    });
    
    const buyTotalQty = document.getElementById('buy-total-items-qty');
    const buyTotalCost = document.getElementById('buy-total-cost');
    const buyRemainingBal = document.getElementById('buy-remaining-balance');
    const buyWarningMsg = document.getElementById('buy-warning-msg');
    const buyConfirmBtn = document.getElementById('buy-confirm-btn');
    
    if (buyTotalQty) buyTotalQty.innerText = `${totalItems} u.`;
    if (buyTotalCost) buyTotalCost.innerText = formatCurrency(totalCost);
    
    const remainingBalance = state.balance - totalCost;
    if (buyRemainingBal) buyRemainingBal.innerText = formatCurrency(remainingBalance);
    
    if (remainingBalance < 0) {
        if (buyWarningMsg) buyWarningMsg.style.display = 'block';
        if (buyConfirmBtn) {
            buyConfirmBtn.disabled = true;
            buyConfirmBtn.style.opacity = '0.5';
            buyConfirmBtn.style.cursor = 'not-allowed';
        }
    } else {
        if (buyWarningMsg) buyWarningMsg.style.display = 'none';
        if (buyConfirmBtn) {
            buyConfirmBtn.disabled = false;
            buyConfirmBtn.style.opacity = '1';
            buyConfirmBtn.style.cursor = 'pointer';
        }
    }
}

async function confirmMineralPurchase() {
    const inputs = document.querySelectorAll('.mineral-buy-input');
    let totalCost = 0;
    let totalItems = 0;
    let itemsToBuy = [];
    
    inputs.forEach(input => {
        const qty = Math.max(0, parseInt(input.value) || 0);
        if (qty > 0) {
            const itemId = input.id.replace('buy-qty-', '');
            const price = parseFloat(input.dataset.price) || 0;
            const name = input.dataset.name || '';
            totalCost += qty * price;
            totalItems += qty;
            itemsToBuy.push({ id: itemId, qty: qty, name: name });
        }
    });
    
    if (totalItems === 0) {
        showToast("Por favor, selecione pelo menos 1 item para comprar.", "warning");
        return;
    }
    
    if (state.balance < totalCost) {
        showToast("Saldo insuficiente no caixa do clube!", "error");
        return;
    }
    
    // Deduct balance
    state.balance -= totalCost;
    
    // Add to inventory
    itemsToBuy.forEach(item => {
        const invItem = state.inventory.find(i => i.id === item.id);
        if (invItem) {
            invItem.qty += item.qty;
        }
    });
    
    // Register financial transaction
    const itemNames = itemsToBuy.map(i => `${i.name} x${i.qty}`).join(', ');
    const transaction = {
        id: 't-' + Date.now(),
        desc: `Compra de Minérios: ${itemNames}`,
        type: 'expense',
        category: 'Mineracao',
        value: totalCost,
        date: new Date().toISOString()
    };
    state.transactions.unshift(transaction);
    
    // Reset inputs
    inputs.forEach(input => {
        input.value = 0;
    });
    
    // Save, sync, and reload UI
    updateUI();
    
    showToast("Compra realizada! Estoque abastecido.", "success");
}

// Auto-run initialization on script load
window.addEventListener('DOMContentLoaded', init);

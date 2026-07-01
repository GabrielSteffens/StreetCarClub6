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

// Helper to calculate total quantity of a recipe/item that can be created based on materials in stock
function getMaxCraftableQty(recipe) {
    if (!state || !state.inventory) return 0;
    
    // Support both 'ingredients' (Kitchen) and 'materials' (3D, Moinho, Po)
    const ingredients = recipe.ingredients || recipe.materials;
    if (!ingredients || Object.keys(ingredients).length === 0) return 0;
    
    let maxCrafts = Infinity;
    for (const [matId, reqQty] of Object.entries(ingredients)) {
        const currentMatStock = getStockQty(matId);
        const possible = Math.floor(currentMatStock / reqQty);
        if (possible < maxCrafts) {
            maxCrafts = possible;
        }
    }
    
    if (maxCrafts === Infinity) return 0;
    
    // Result quantity per craft (defaults to 1 if not specified)
    const yieldPerCraft = recipe.resultQty || 1;
    return maxCrafts * yieldPerCraft;
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
        { id: 'titanio_forjado', name: 'Barra de Titânio', category: 'mineracao', type: 'forged', qty: 1, minQty: 5, label: 'TI+' },
        
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
        { id: 'volante_motor_bruto', name: 'Volante de Motor Bruto', category: 'impressorapo', type: 'other', qty: 0, minQty: 5, label: 'VMB' },
        
        // Bancada de Trabalho Raw / Intermediate Materials
        { id: 'jogo_bronzinas', name: 'Jogo de Bronzinas', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'JBr' },
        { id: 'tratamento_forjado', name: 'Tratamento Forjado', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TF' },
        { id: 'coletor_itb_sport', name: 'Coletor ITB Sport', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'CIS' },
        { id: 'sensor_map_4bar', name: 'Sensor MAP 4 Bar', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'SM4' },
        { id: 'sensor_pressao', name: 'Sensor de Pressão', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'SP' },
        { id: 'coletor_racetune', name: 'Coletor RaceTune', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'CRT' },
        { id: 'coletor_highflow', name: 'Coletor HighFlow', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'CHF' },
        { id: 'mangote_silicone', name: 'Mangote de Silicone', category: 'bancada', type: 'raw', qty: 25, minQty: 15, label: 'MS' },
        { id: 'sensor_maf', name: 'Sensor MAF', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'SMA' },
        { id: 'gateway_can', name: 'Gateway CAN', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'GC' },
        { id: 'sensor_tps', name: 'Sensor TPS', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'ST' },
        { id: 'tbi_maxflow_80mm', name: 'TBI MaxFlow 80mm', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TM8' },
        { id: 'tbi_powerbore_70mm', name: 'TBI PowerBore 70mm', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TP7' },
        { id: 'conector_selado', name: 'Conector Selado', category: 'bancada', type: 'raw', qty: 20, minQty: 10, label: 'CSl' },
        { id: 'tbi_60mm', name: 'TBI 60mm', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'T6' },
        { id: 'abracadeira_vband', name: 'Abraçadeira V-Band', category: 'bancada', type: 'raw', qty: 20, minQty: 10, label: 'AVB' },
        { id: 'escape_titanio', name: 'Escape de Titânio', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'ETi' },
        { id: 'tratamento_termico', name: 'Tratamento Térmico', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'TT' },
        { id: 'bomba_780_lph', name: 'Bomba 780 LPH', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'B78' },
        { id: 'motor_bomba', name: 'Motor de Bomba', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'MB' },
        { id: 'bomba_620_lph', name: 'Bomba 620 LPH', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'B62' },
        { id: 'componentes_eletronicos', name: 'Componentes Eletrônicos', category: 'bancada', type: 'raw', qty: 50, minQty: 20, label: 'CEl' },
        { id: 'engrenagens_street', name: 'Engrenagens Street', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'ES' },
        { id: 'engrenagens_race', name: 'Engrenagens Race', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'ER' },
        { id: 'cambio_auto_6m', name: 'Câmbio Auto 6-Marchas', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'CA6' },
        { id: 'jogo_sincronizadores', name: 'Jogo de Sincronizadores', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'JS' },
        { id: 'kit_embreagem', name: 'Kit de Embreagem', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'KE' },
        { id: 'cambio_manual_5m', name: 'Câmbio Manual 5-Marchas', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'CM5' },
        { id: 'comando_280_pistao', name: 'Comando 280°', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'C28' },
        { id: 'comando_268_perfil', name: 'Comando 268°', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'C26' },
        { id: 'controlador_wideband', name: 'Controlador Wideband', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'CW' },
        { id: 'chip_firmware', name: 'Chip de Firmware', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'CFw' },
        { id: 'modulo_processamento', name: 'Módulo Processamento', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'MPr' },
        { id: 'tela_ft450', name: 'Tela FT450', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TF4' },
        { id: 'intercooler_iceboost', name: 'Intercooler IceBoost', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'IIB' },
        { id: 'intercooler_maxchill', name: 'Intercooler MaxChill', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'IMC' },
        { id: 'folha_cobre', name: 'Folha de Cobre', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'FCb' },
        { id: 'folha_inconel', name: 'Folha de Inconel', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'FIn' },
        { id: 'folha_mls', name: 'Folha MLS', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'FMl' },
        { id: 'diferencial_lsd_competicao', name: 'Diferencial LSD de Competição', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'DLC' },
        { id: 'diferencial_viscoso', name: 'Diferencial Viscoso', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'DV' },
        { id: 'jogo_aneis_pistao', name: 'Jogo de Anéis de Pistão', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'JAP' },
        { id: 'filamento_plastico', name: 'Filamento Plástico', category: 'bancada', type: 'raw', qty: 20, minQty: 10, label: 'FPl' },
        { id: 'chicote_ecu', name: 'Chicote de ECU', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'ChE' },
        { id: 'radiador_racing_tech', name: 'Radiador Racing Tech', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'RRT' },
        { id: 'ventoinha_slim', name: 'Ventoinha Slim', category: 'bancada', type: 'raw', qty: 20, minQty: 10, label: 'VSl' },
        { id: 'tampa_pressurizada', name: 'Tampa Pressurizada', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'TP' },
        { id: 'radiador_aluminio', name: 'Radiador Alumínio', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'RAl' },
        { id: 'bomba_carter_seco', name: 'Bomba de Cárter Seco', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'BCS' },
        { id: 'nucleo_radiador', name: 'Núcleo de Radiador', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'NRa' },
        { id: 'radiador_oleo', name: 'Radiador de Óleo', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'ROl' },
        { id: 'controlador_pressao', name: 'Controlador de Pressão', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'CP' },
        { id: 'rolamento_ceramico', name: 'Rolamento Cerâmico', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'RCe' },
        { id: 'turbo_gt35_82', name: 'Turbo GT35 .82', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TGT' },
        { id: 'turbo_t28_64', name: 'Turbo T28 .64', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TT2' },
        { id: 'nucleo_twinscroll', name: 'Núcleo Twin-Scroll', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'NTS' },
        { id: 'nucleo_turbo', name: 'Núcleo de Turbo', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'NTu' },
        { id: 'wastegate', name: 'Wastegate', category: 'bancada', type: 'raw', qty: 15, minQty: 10, label: 'WG' },
        { id: 'turbo_gt30_82', name: 'Turbo GT30 .82', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'TG3' },
        { id: 'eletrodo_vela', name: 'Eletrodo de Vela', category: 'bancada', type: 'raw', qty: 25, minQty: 15, label: 'EV' },
        { id: 'virabrequim_tarugo', name: 'Virabrequim de Tarugo', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'VTg' },
        { id: 'volante_racing_billet', name: 'Volante Racing Billet', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'VRB' },
        { id: 'volante_aluminio_light', name: 'Volante Alumínio Light', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'VAL' },
        { id: 'volante_aliviado_street', name: 'Volante Aliviado Street', category: 'bancada', type: 'raw', qty: 10, minQty: 5, label: 'VAS' },
        
        // Bancada de Trabalho Crafted Products
        { id: 'coletor_admissao_prototype', category: 'admissao_escape', name: 'Coletor Admissão Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CAP' },
        { id: 'coletor_admissao_race', category: 'admissao_escape', name: 'Coletor Admissão Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CAR' },
        { id: 'coletor_admissao_street', category: 'admissao_escape', name: 'Coletor Admissão Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CAS' },
        { id: 'coletor_admissao_track', category: 'admissao_escape', name: 'Coletor Admissão Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CAT' },
        { id: 'corpo_borboleta_prototype', category: 'admissao_escape', name: 'Corpo Borboleta Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CBP' },
        { id: 'corpo_borboleta_race', category: 'admissao_escape', name: 'Corpo Borboleta Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CBR' },
        { id: 'corpo_borboleta_street', category: 'admissao_escape', name: 'Corpo Borboleta Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CBS' },
        { id: 'corpo_borboleta_track', category: 'admissao_escape', name: 'Corpo Borboleta Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CBT' },
        { id: 'escape_prototype', category: 'admissao_escape', name: 'Escape Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'EP' },
        { id: 'biela_forjada_oem', category: 'biela', name: 'Biela Forjada OEM', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BFO' },
        { id: 'biela_h_beam', category: 'biela', name: 'Biela H-Beam', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BHB' },
        { id: 'biela_titanio', category: 'biela', name: 'Biela Titânio', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BTi' },
        { id: 'bloco_aluminio', category: 'bloco', name: 'Bloco Alumínio', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BAl' },
        { id: 'bloco_billet', category: 'bloco', name: 'Bloco Billet', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BBi' },
        { id: 'bloco_ferro_fundido', category: 'bloco', name: 'Bloco Ferro Fundido', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BFF' },
        { id: 'bomba_combustivel_prototype', category: 'bomba', name: 'Bomba Combustível Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BCP' },
        { id: 'bomba_combustivel_race', category: 'bomba', name: 'Bomba Combustível Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BCR' },
        { id: 'bomba_combustivel_street', category: 'bomba', name: 'Bomba Combustível Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BCS' },
        { id: 'bomba_combustivel_track', category: 'bomba', name: 'Bomba Combustível Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BCT' },
        { id: 'cabecote_aluminio', category: 'cabecote', name: 'Cabeçote Alumínio', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CAl' },
        { id: 'cabecote_cnc_billet', category: 'cabecote', name: 'Cabeçote CNC Billet', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CCB' },
        { id: 'cabecote_ferro', category: 'cabecote', name: 'Cabeçote Ferro', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CFe' },
        { id: 'coroa_pinhao_aceleracao', category: 'cambio_transmissao', name: 'Coroa e Pinhão Aceleração', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CPA' },
        { id: 'coroa_pinhao_balanceado', category: 'cambio_transmissao', name: 'Coroa e Pinhão Balanceado', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CPB' },
        { id: 'coroa_pinhao_race', category: 'cambio_transmissao', name: 'Coroa e Pinhão Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CPR' },
        { id: 'coroa_pinhao_velocidade', category: 'cambio_transmissao', name: 'Coroa e Pinhão Velocidade', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CPV' },
        { id: 'cambio_prototype', category: 'cambio_transmissao', name: 'Câmbio Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CPt' },
        { id: 'cambio_street', category: 'cambio_transmissao', name: 'Câmbio Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CSt' },
        { id: 'cambio_track', category: 'cambio_transmissao', name: 'Câmbio Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'CTk' },
        { id: 'comando_prototype', category: 'comando', name: 'Comando Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'COt' },
        { id: 'comando_race', category: 'comando', name: 'Comando Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'COr' },
        { id: 'comando_street', category: 'comando', name: 'Comando Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'COs' },
        { id: 'comando_track', category: 'comando', name: 'Comando Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'COk' },
        { id: 'ecu_ecumaster', category: 'ecu', name: 'ECU Ecumaster', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'EEc' },
        { id: 'ecu_ft550', category: 'ecu', name: 'ECU FT550', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'EF5' },
        { id: 'ecu_ft700', category: 'ecu', name: 'ECU FT700', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'EF7' },
        { id: 'ecu_ft700_plus', category: 'ecu', name: 'ECU FT700 Plus', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'EFP' },
        { id: 'ecu_octtane_race', category: 'ecu', name: 'ECU Octtane Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'EOR' },
        { id: 'ecu_race_dash', category: 'ecu', name: 'ECU RACE DASH', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ERD' },
        { id: 'intercooler_prototype', category: 'intercooler', name: 'Intercooler Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ICP' },
        { id: 'intercooler_race', category: 'intercooler', name: 'Intercooler Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ICR' },
        { id: 'intercooler_street', category: 'intercooler', name: 'Intercooler Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ICS' },
        { id: 'intercooler_track', category: 'intercooler', name: 'Intercooler Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ICT' },
        { id: 'junta_cabecote_prototype', category: 'junta', name: 'Junta Cabeçote Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'JCP' },
        { id: 'junta_cabecote_race', category: 'junta', name: 'Junta Cabeçote Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'JCR' },
        { id: 'junta_cabecote_street', category: 'junta', name: 'Junta Cabeçote Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'JCS' },
        { id: 'junta_cabecote_track', category: 'junta', name: 'Junta Cabeçote Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'JCT' },
        { id: 'diferencial_prototype', category: 'cambio_transmissao', name: 'Diferencial Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'DFP' },
        { id: 'diferencial_race', category: 'cambio_transmissao', name: 'Diferencial Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'DFR' },
        { id: 'diferencial_street', category: 'cambio_transmissao', name: 'Diferencial Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'DFS' },
        { id: 'diferencial_track', category: 'cambio_transmissao', name: 'Diferencial Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'DFT' },
        { id: 'pistao_forjado', category: 'pistao', name: 'Pistão Forjado', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'PFo' },
        { id: 'pistao_fundido', category: 'pistao', name: 'Pistão Fundido', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'PFu' },
        { id: 'pistao_titanio', category: 'pistao', name: 'Pistão Titânio', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'PTi' },
        { id: 'placa_conectora_ecu', category: 'ecu', name: 'Placa Conectora de ECU', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'PCE' },
        { id: 'placa_ecu_ecumaster', category: 'ecu', name: 'Placa ECU Ecumaster', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'PEE' },
        { id: 'placa_ecu_octtane', category: 'ecu', name: 'Placa ECU Octtane', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'PEO' },
        { id: 'radiador_prototype', category: 'radiador', name: 'Radiador Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'RPr' },
        { id: 'radiador_race', category: 'radiador', name: 'Radiador Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'RRa' },
        { id: 'radiador_street', category: 'radiador', name: 'Radiador Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'RSt' },
        { id: 'radiador_track', category: 'radiador', name: 'Radiador Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'RTr' },
        { id: 'radiador_oleo_prototype', category: 'radiador', name: 'Radiador Óleo Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ROP' },
        { id: 'radiador_oleo_race', category: 'radiador', name: 'Radiador Óleo Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ROR' },
        { id: 'radiador_oleo_street', category: 'radiador', name: 'Radiador Óleo Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ROS' },
        { id: 'radiador_oleo_track', category: 'radiador', name: 'Radiador Óleo Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'ROT' },
        { id: 'biturbo_race', category: 'turbo', name: 'Biturbo Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BTR' },
        { id: 'biturbo_street', category: 'turbo', name: 'Biturbo Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'BTS' },
        { id: 'turbo_prototype', category: 'turbo', name: 'Turbo Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TPt' },
        { id: 'turbo_race_mid', category: 'turbo', name: 'Turbo Race Mid', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TRM' },
        { id: 'turbo_race_top', category: 'turbo', name: 'Turbo Race Top', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TRT' },
        { id: 'turbo_street_low', category: 'turbo', name: 'Turbo Street Low', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TSL' },
        { id: 'turbo_street_mid', category: 'turbo', name: 'Turbo Street Mid', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TSM' },
        { id: 'twin_turbo_drag', category: 'turbo', name: 'Twin Turbo Drag', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TTD' },
        { id: 'twin_turbo_race', category: 'turbo', name: 'Twin Turbo Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'TTR' },
        { id: 'vela_ignicao_street', category: 'vela', name: 'Vela Ignição Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VIS' },
        { id: 'virabrequim_prototype', category: 'virabrequim', name: 'Virabrequim Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VPt' },
        { id: 'virabrequim_race', category: 'virabrequim', name: 'Virabrequim Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VRa' },
        { id: 'virabrequim_street', category: 'virabrequim', name: 'Virabrequim Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VSt' },
        { id: 'virabrequim_track', category: 'virabrequim', name: 'Virabrequim Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VTk' },
        { id: 'volante_motor_prototype', category: 'volante', name: 'Volante Motor Prototype', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VMP' },
        { id: 'volante_motor_race', category: 'volante', name: 'Volante Motor Race', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VMR' },
        { id: 'volante_motor_street', category: 'volante', name: 'Volante Motor Street', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VMS' },
        { id: 'volante_motor_track', category: 'volante', name: 'Volante Motor Track', category: 'bancada', type: 'other', qty: 0, minQty: 5, label: 'VMT' }
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

// Bancada de Trabalho Recipe Data
const bancadaRecipes = [
    { id: 'coletor_admissao_prototype', category: 'admissao_escape', name: 'Coletor Admissão Prototype', time: '05:00', materials: { titanio_forjado: 1, coletor_itb_sport: 1, sensor_map_4bar: 1, sensor_pressao: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'coletor_admissao_race', category: 'admissao_escape', name: 'Coletor Admissão Race', time: '05:00', materials: { titanio_forjado: 1, coletor_racetune: 1, sensor_map_4bar: 1, sensor_pressao: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'coletor_admissao_street', category: 'admissao_escape', name: 'Coletor Admissão Street', time: '05:00', materials: { borracha: 2, corpo_borboleta_bruto: 1, duto_admissao: 1, po_aluminio: 2 }, skill: 'mecanico', xp: 400 },
    { id: 'coletor_admissao_track', category: 'admissao_escape', name: 'Coletor Admissão Track', time: '05:00', materials: { coletor_highflow: 1, corpo_borboleta_bruto: 1, mangote_silicone: 2, sensor_maf: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'corpo_borboleta_prototype', category: 'admissao_escape', name: 'Corpo Borboleta Prototype', time: '05:00', materials: { titanio_forjado: 1, gateway_can: 1, sensor_tps: 1, tbi_maxflow_80mm: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'corpo_borboleta_race', category: 'admissao_escape', name: 'Corpo Borboleta Race', time: '05:00', materials: { titanio_forjado: 1, gateway_can: 1, sensor_tps: 1, tbi_powerbore_70mm: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'corpo_borboleta_street', category: 'admissao_escape', name: 'Corpo Borboleta Street', time: '05:00', materials: { conector_selado: 1, corpo_borboleta_bruto: 1, sensor_tps: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'corpo_borboleta_track', category: 'admissao_escape', name: 'Corpo Borboleta Track', time: '05:00', materials: { po_aluminio: 2, sensor_tps: 1, sensor_pressao: 1, tbi_60mm: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'escape_prototype', category: 'admissao_escape', name: 'Escape Prototype', time: '05:00', materials: { abracadeira_vband: 4, titanio_forjado: 2, escape_titanio: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'biela_forjada_oem', category: 'biela', name: 'Biela Forjada OEM', time: '05:00', materials: { jogo_bronzinas: 1, molde_biela_usinada: 4 }, skill: 'mecanico', xp: 400 },
    { id: 'biela_h_beam', category: 'biela', name: 'Biela H-Beam', time: '05:00', materials: { jogo_bronzinas: 1, molde_biela_usinada: 4, tratamento_forjado: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'biela_titanio', category: 'biela', name: 'Biela Titânio', time: '05:00', materials: { titanio_forjado: 1, jogo_bronzinas: 1, molde_biela_usinada: 4 }, skill: 'mecanico', xp: 2400 },
    { id: 'bloco_aluminio', category: 'bloco', name: 'Bloco Alumínio', time: '05:00', materials: { bloco_bruto_aluminio: 1, jogo_bronzinas: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'bloco_billet', category: 'bloco', name: 'Bloco Billet', time: '05:00', materials: { bloco_bruto_aluminio: 1, bloco_bruto_ferro: 1, jogo_bronzinas: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 3000 },
    { id: 'bloco_ferro_fundido', category: 'bloco', name: 'Bloco Ferro Fundido', time: '05:00', materials: { bloco_bruto_ferro: 1, jogo_bronzinas: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'bomba_combustivel_prototype', category: 'bomba', name: 'Bomba Combustível Prototype', time: '05:00', materials: { bomba_780_lph: 1, conector_selado: 2, gateway_can: 1, motor_bomba: 1, sensor_pressao: 2 }, skill: 'mecanico', xp: 3200 },
    { id: 'bomba_combustivel_race', category: 'bomba', name: 'Bomba Combustível Race', time: '05:00', materials: { bomba_620_lph: 1, conector_selado: 1, gateway_can: 1, motor_bomba: 1, sensor_pressao: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'bomba_combustivel_street', category: 'bomba', name: 'Bomba Combustível Street', time: '05:00', materials: { componentes_eletronicos: 2, borracha: 2, conector_selado: 1, motor_bomba: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'bomba_combustivel_track', category: 'bomba', name: 'Bomba Combustível Track', time: '05:00', materials: { componentes_eletronicos: 4, borracha: 2, conector_selado: 1, motor_bomba: 2, sensor_pressao: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'cabecote_aluminio', category: 'cabecote', name: 'Cabeçote Alumínio', time: '05:00', materials: { cabecote_bruto: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'cabecote_cnc_billet', category: 'cabecote', name: 'Cabeçote CNC Billet', time: '05:00', materials: { cabecote_aluminio: 1, po_aco: 3 }, skill: 'mecanico', xp: 3000 },
    { id: 'cabecote_ferro', category: 'cabecote', name: 'Cabeçote Ferro', time: '05:00', materials: { cabecote_bruto: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'coroa_pinhao_aceleracao', category: 'cambio_transmissao', name: 'Coroa e Pinhão Aceleração', time: '05:00', materials: { engrenagens_street: 1, po_aco: 4 }, skill: 'mecanico', xp: 400 },
    { id: 'coroa_pinhao_balanceado', category: 'cambio_transmissao', name: 'Coroa e Pinhão Balanceado', time: '05:00', materials: { engrenagens_street: 1, po_aco: 4 }, skill: 'mecanico', xp: 1200 },
    { id: 'coroa_pinhao_race', category: 'cambio_transmissao', name: 'Coroa e Pinhão Race', time: '05:00', materials: { titanio_forjado: 1, coroa_pinhao_velocidade: 1, engrenagens_race: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'coroa_pinhao_velocidade', category: 'cambio_transmissao', name: 'Coroa e Pinhão Velocidade', time: '05:00', materials: { engrenagens_street: 1, po_aco: 5, tratamento_termico: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'cambio_prototype', category: 'cambio_transmissao', name: 'Câmbio Prototype', time: '05:00', materials: { titanio_forjado: 1, cambio_auto_6m: 1, engrenagens_race: 1, jogo_sincronizadores: 2, kit_embreagem: 2 }, skill: 'mecanico', xp: 3200 },
    { id: 'cambio_street', category: 'cambio_transmissao', name: 'Câmbio Street', time: '05:00', materials: { carcaca_cambio_bruta: 1, engrenagens_street: 1, jogo_sincronizadores: 1, kit_embreagem: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'cambio_track', category: 'cambio_transmissao', name: 'Câmbio Track', time: '05:00', materials: { cambio_manual_5m: 1, engrenagens_street: 1, jogo_sincronizadores: 1, kit_embreagem: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'comando_prototype', category: 'comando', name: 'Comando Prototype', time: '05:00', materials: { titanio_forjado: 1, comando_bruto: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'comando_race', category: 'comando', name: 'Comando Race', time: '05:00', materials: { titanio_forjado: 1, comando_bruto: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'comando_street', category: 'comando', name: 'Comando Street', time: '05:00', materials: { comando_bruto: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'comando_track', category: 'comando', name: 'Comando Track', time: '05:00', materials: { comando_bruto: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'ecu_ecumaster', category: 'ecu', name: 'ECU Ecumaster', time: '05:00', materials: { prata_forjado: 15, carcaca_ecu_ecumaster: 1, chip_firmware: 1, componentes_eletronicos: 14, controlador_wideband: 1, fio_cobre: 8, conector_selado: 1, modulo_processamento: 1, placa_ecu_ecumaster: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'ecu_ft550', category: 'ecu', name: 'ECU FT550', time: '05:00', materials: { base_ecu: 1, componentes_eletronicos: 4, placa_conectora_ecu: 1, suporte_ecu: 1, tela_ft450: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'ecu_ft700', category: 'ecu', name: 'ECU FT700', time: '05:00', materials: { base_ecu: 1, chip_firmware: 1, componentes_eletronicos: 10, conector_selado: 1, modulo_processamento: 1, placa_conectora_ecu: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'ecu_ft700_plus', category: 'ecu', name: 'ECU FT700 Plus', time: '05:00', materials: { base_ecu: 1, chip_firmware: 1, componentes_eletronicos: 10, conector_selado: 1, modulo_processamento: 1, placa_conectora_ecu: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'ecu_octtane_race', category: 'ecu', name: 'ECU Octtane Race', time: '05:00', materials: { carcaca_ecu_octtane: 1, chicote_ecu: 1, componentes_eletronicos: 10, controlador_wideband: 1, modulo_processamento: 1, placa_ecu_octtane: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'ecu_race_dash', category: 'ecu', name: 'ECU RACE DASH', time: '05:00', materials: { base_ecu: 1, chip_firmware: 1, componentes_eletronicos: 10, conector_selado: 1, modulo_processamento: 1, placa_conectora_ecu: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'intercooler_prototype', category: 'intercooler', name: 'Intercooler Prototype', time: '05:00', materials: { titanio_forjado: 1, intercooler_iceboost: 1, mangote_silicone: 4, nucleo_bruto_intercooler: 1, sensor_pressao: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'intercooler_race', category: 'intercooler', name: 'Intercooler Race', time: '05:00', materials: { titanio_forjado: 1, intercooler_maxchill: 1, mangote_silicone: 4, nucleo_bruto_intercooler: 1, sensor_pressao: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'intercooler_street', category: 'intercooler', name: 'Intercooler Street', time: '05:00', materials: { caixa_lateral_intercooler: 2, mangote_silicone: 2, nucleo_bruto_intercooler: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'intercooler_track', category: 'intercooler', name: 'Intercooler Track', time: '05:00', materials: { caixa_lateral_intercooler: 2, duto_intercooler: 1, mangote_silicone: 4, nucleo_bruto_intercooler: 2, sensor_pressao: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'junta_cabecote_prototype', category: 'junta', name: 'Junta Cabeçote Prototype', time: '05:00', materials: { folha_cobre: 1, folha_inconel: 1, po_aco: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'junta_cabecote_race', category: 'junta', name: 'Junta Cabeçote Race', time: '05:00', materials: { folha_cobre: 2, po_aco: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'junta_cabecote_street', category: 'junta', name: 'Junta Cabeçote Street', time: '05:00', materials: { fio_cobre: 1, folha_mls: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'junta_cabecote_track', category: 'junta', name: 'Junta Cabeçote Track', time: '05:00', materials: { fio_cobre: 1, folha_mls: 2, po_aco: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'diferencial_prototype', category: 'cambio_transmissao', name: 'Diferencial Prototype', time: '05:00', materials: { titanio_forjado: 1, coroa_pinhao_race: 1, diferencial_lsd_competicao: 1, nucleo_lsd: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'diferencial_race', category: 'cambio_transmissao', name: 'Diferencial Race', time: '05:00', materials: { carcaca_diferencial_bruta: 1, engrenagens_race: 1, nucleo_lsd: 1, tratamento_termico: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'diferencial_street', category: 'cambio_transmissao', name: 'Diferencial Street', time: '05:00', materials: { carcaca_diferencial_bruta: 1, engrenagens_street: 1, nucleo_lsd: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'diferencial_track', category: 'cambio_transmissao', name: 'Diferencial Track', time: '05:00', materials: { coroa_pinhao_balanceado: 1, diferencial_viscoso: 1, nucleo_lsd: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'pistao_forjado', category: 'pistao', name: 'Pistão Forjado', time: '05:00', materials: { jogo_aneis_pistao: 1, molde_pistao_usinado: 4, tratamento_forjado: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'pistao_fundido', category: 'pistao', name: 'Pistão Fundido', time: '05:00', materials: { jogo_aneis_pistao: 1, molde_pistao_usinado: 4 }, skill: 'mecanico', xp: 400 },
    { id: 'pistao_titanio', category: 'pistao', name: 'Pistão Titânio', time: '05:00', materials: { prata_forjado: 14, titanio_forjado: 2, fio_cobre: 8, jogo_aneis_pistao: 1, molde_pistao_usinado: 4, po_aluminio: 4 }, skill: 'mecanico', xp: 2400 },
    { id: 'placa_conectora_ecu', category: 'ecu', name: 'Placa Conectora de ECU', time: '05:00', materials: { prata_forjado: 1, componentes_eletronicos: 3, filamento_plastico: 1, fio_cobre: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'placa_ecu_ecumaster', category: 'ecu', name: 'Placa ECU Ecumaster', time: '05:00', materials: { prata_forjado: 4, componentes_eletronicos: 7, conector_selado: 2, fio_cobre: 2, gateway_can: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'placa_ecu_octtane', category: 'ecu', name: 'Placa ECU Octtane', time: '05:00', materials: { prata_forjado: 2, componentes_eletronicos: 5, conector_selado: 1, fio_cobre: 1 }, skill: 'mecanico', xp: 500 },
    { id: 'radiador_prototype', category: 'radiador', name: 'Radiador Prototype', time: '05:00', materials: { titanio_forjado: 1, nucleo_bruto_radiador: 1, radiador_racing_tech: 1, sensor_pressao: 1, ventoinha_slim: 2 }, skill: 'mecanico', xp: 3200 },
    { id: 'radiador_race', category: 'radiador', name: 'Radiador Race', time: '05:00', materials: { mangote_silicone: 4, nucleo_bruto_radiador: 2, sensor_pressao: 1, tampa_pressurizada: 1, ventoinha_slim: 2 }, skill: 'mecanico', xp: 2400 },
    { id: 'radiador_street', category: 'radiador', name: 'Radiador Street', time: '05:00', materials: { mangote_silicone: 2, nucleo_bruto_radiador: 1, tampa_pressurizada: 1, ventoinha_slim: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'radiador_track', category: 'radiador', name: 'Radiador Track', time: '05:00', materials: { nucleo_bruto_radiador: 1, radiador_aluminio: 1, tampa_pressurizada: 1, ventoinha_slim: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'radiador_oleo_prototype', category: 'radiador', name: 'Radiador Óleo Prototype', time: '05:00', materials: { titanio_forjado: 1, bomba_carter_seco: 1, nucleo_radiador: 2, radiador_oleo: 1, sensor_pressao: 2 }, skill: 'mecanico', xp: 3200 },
    { id: 'radiador_oleo_race', category: 'radiador', name: 'Radiador Óleo Race', time: '05:00', materials: { bomba_carter_seco: 1, nucleo_radiador: 2, radiador_oleo: 1, sensor_pressao: 2 }, skill: 'mecanico', xp: 2400 },
    { id: 'radiador_oleo_street', category: 'radiador', name: 'Radiador Óleo Street', time: '05:00', materials: { mangote_silicone: 2, nucleo_radiador: 1, po_aluminio: 2 }, skill: 'mecanico', xp: 400 },
    { id: 'radiador_oleo_track', category: 'radiador', name: 'Radiador Óleo Track', time: '05:00', materials: { nucleo_radiador: 1, radiador_oleo: 1, sensor_pressao: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'biturbo_race', category: 'turbo', name: 'Biturbo Race', time: '05:00', materials: { abracadeira_vband: 6, controlador_pressao: 2, rolamento_ceramico: 2, turbo_gt35_82: 2 }, skill: 'mecanico', xp: 3400 },
    { id: 'biturbo_street', category: 'turbo', name: 'Biturbo Street', time: '05:00', materials: { abracadeira_vband: 4, controlador_pressao: 1, turbo_t28_64: 2 }, skill: 'mecanico', xp: 3400 },
    { id: 'turbo_prototype', category: 'turbo', name: 'Turbo Prototype', time: '05:00', materials: { titanio_forjado: 1, carcaca_turbo_race: 1, controlador_pressao: 1, nucleo_twinscroll: 1, rolamento_ceramico: 1, rotor_compressor: 1 }, skill: 'mecanico', xp: 3400 },
    { id: 'turbo_race_mid', category: 'turbo', name: 'Turbo Race Mid', time: '05:00', materials: { carcaca_turbo_media: 1, controlador_pressao: 1, nucleo_turbo: 1, rolamento_ceramico: 1, rotor_compressor: 1, wastegate: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'turbo_race_top', category: 'turbo', name: 'Turbo Race Top', time: '05:00', materials: { carcaca_turbo_race: 1, controlador_pressao: 1, nucleo_turbo: 1, rolamento_ceramico: 1, rotor_compressor: 1, wastegate: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'turbo_street_low', category: 'turbo', name: 'Turbo Street Low', time: '05:00', materials: { carcaca_turbo_pequena: 1, nucleo_turbo: 1, rotor_compressor: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'turbo_street_mid', category: 'turbo', name: 'Turbo Street Mid', time: '05:00', materials: { carcaca_turbo_media: 1, nucleo_turbo: 1, rotor_compressor: 1, wastegate: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'twin_turbo_drag', category: 'turbo', name: 'Twin Turbo Drag', time: '05:00', materials: { abracadeira_vband: 6, controlador_pressao: 2, rolamento_ceramico: 1, turbo_gt35_82: 2 }, skill: 'mecanico', xp: 3400 },
    { id: 'twin_turbo_race', category: 'turbo', name: 'Twin Turbo Race', time: '05:00', materials: { abracadeira_vband: 4, coletor_escape_bruto: 1, controlador_pressao: 1, turbo_gt30_82: 2 }, skill: 'mecanico', xp: 3400 },
    { id: 'vela_ignicao_street', category: 'vela', name: 'Vela Ignição Street', time: '05:00', materials: { prata_forjado: 1, eletrodo_vela: 4, fio_cobre: 1, po_aco: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'virabrequim_prototype', category: 'virabrequim', name: 'Virabrequim Prototype', time: '05:00', materials: { titanio_forjado: 1, tratamento_termico: 1, virabrequim_tarugo: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'virabrequim_race', category: 'virabrequim', name: 'Virabrequim Race', time: '05:00', materials: { jogo_bronzinas: 1, tratamento_termico: 1, virabrequim_bruto: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'virabrequim_street', category: 'virabrequim', name: 'Virabrequim Street', time: '05:00', materials: { jogo_bronzinas: 1, virabrequim_bruto: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'virabrequim_track', category: 'virabrequim', name: 'Virabrequim Track', time: '05:00', materials: { jogo_bronzinas: 1, virabrequim_bruto: 1 }, skill: 'mecanico', xp: 1200 },
    { id: 'volante_motor_prototype', category: 'volante', name: 'Volante Motor Prototype', time: '05:00', materials: { titanio_forjado: 1, volante_racing_billet: 1, volante_motor_bruto: 1 }, skill: 'mecanico', xp: 3200 },
    { id: 'volante_motor_race', category: 'volante', name: 'Volante Motor Race', time: '05:00', materials: { tratamento_termico: 1, volante_aluminio_light: 1, volante_motor_bruto: 1 }, skill: 'mecanico', xp: 2400 },
    { id: 'volante_motor_street', category: 'volante', name: 'Volante Motor Street', time: '05:00', materials: { volante_motor_bruto: 1 }, skill: 'mecanico', xp: 400 },
    { id: 'volante_motor_track', category: 'volante', name: 'Volante Motor Track', time: '05:00', materials: { volante_aliviado_street: 1, volante_motor_bruto: 1 }, skill: 'mecanico', xp: 1200 }
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
    renderBancada();
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
    renderBancada();
    renderConversao();
    
    // Update Bancada base materials
    const wBronzinas = document.getElementById('bancada-mat-jogo_bronzinas');
    const wConectorSelado = document.getElementById('bancada-mat-conector_selado');
    const wTratamentoTermico = document.getElementById('bancada-mat-tratamento_termico');
    const wTratamentoForjado = document.getElementById('bancada-mat-tratamento_forjado');
    const wCompEletr = document.getElementById('bancada-mat-componentes_eletronicos');
    const wFioCobre = document.getElementById('bancada-mat-fio_cobre');

    if (wBronzinas) wBronzinas.textContent = `${getStockQty('jogo_bronzinas')} u.`;
    if (wConectorSelado) wConectorSelado.textContent = `${getStockQty('conector_selado')} u.`;
    if (wTratamentoTermico) wTratamentoTermico.textContent = `${getStockQty('tratamento_termico')} u.`;
    if (wTratamentoForjado) wTratamentoForjado.textContent = `${getStockQty('tratamento_forjado')} u.`;
    if (wCompEletr) wCompEletr.textContent = `${getStockQty('componentes_eletronicos')} u.`;
    if (wFioCobre) wFioCobre.textContent = `${getStockQty('fio_cobre')} u.`;
    
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
    const sections = ['dashboard', 'mineracao', 'cozinha', 'impressora3d', 'moinho', 'impressorapo', 'bancada', 'gastos', 'estoque', 'calc-compra', 'conversao'];
    
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
        case 'bancada':
            headerTitle.textContent = "Bancada de Trabalho";
            headerDesc.textContent = "Montagem final de motores, coletores, cabeçotes e componentes de alta performance.";
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
        
        const maxCraftable = getMaxCraftableQty(recipe);
        const maxCraftableText = maxCraftable > 0 
            ? `<strong style="color: var(--accent-green);">${maxCraftable} u.</strong>` 
            : `<span style="color: var(--text-muted); font-weight: normal;">0 u.</span>`;
        
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
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-cyan);">${currentStock} u.</strong> | Pode imprimir: ${maxCraftableText}
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
        
        const maxCraftable = getMaxCraftableQty(recipe);
        const maxCraftableText = maxCraftable > 0 
            ? `<strong style="color: var(--accent-green);">${maxCraftable} u.</strong>` 
            : `<span style="color: var(--text-muted); font-weight: normal;">0 u.</span>`;
            
        const cardHTML = `
            <div class="kitchen-recipe-card">
                <div>
                    <div class="kitchen-recipe-header">
                        <h4 class="kitchen-recipe-title">${recipe.name}</h4>
                    </div>
                    <div class="kitchen-recipe-body">
                        Ingredientes: <div style="margin: 0.25rem 0;">${ingredientsHTML}</div>
                        No estoque: <strong style="color: var(--accent-pink);">${currentStock} u.</strong> | Pode preparar: ${maxCraftableText}
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
        
        const maxCraftable = getMaxCraftableQty(recipe);
        const maxCraftableText = maxCraftable > 0 
            ? `<strong style="color: var(--accent-green);">${maxCraftable} u.</strong>` 
            : `<span style="color: var(--text-muted); font-weight: normal;">0 u.</span>`;
        
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
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-orange);">${currentStock} u.</strong> | Pode refinar: ${maxCraftableText}
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
        
        const maxCraftable = getMaxCraftableQty(recipe);
        const maxCraftableText = maxCraftable > 0 
            ? `<strong style="color: var(--accent-green);">${maxCraftable} u.</strong>` 
            : `<span style="color: var(--text-muted); font-weight: normal;">0 u.</span>`;
        
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
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-red);">${currentStock} u.</strong> | Pode produzir: ${maxCraftableText}
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
   BANCADA DE TRABALHO LOGIC
   ========================================================================== */

let currentBancadaFilter = 'all';

function filterBancada(category) {
    currentBancadaFilter = category;
    
    const categories = ['all', 'admissao_escape', 'biela', 'bloco', 'bomba', 'cabecote', 'cambio_transmissao', 'comando', 'ecu', 'intercooler', 'junta', 'pistao', 'radiador', 'turbo', 'vela', 'virabrequim', 'volante'];
    categories.forEach(cat => {
        const btn = document.getElementById(`bancada-filter-${cat}`);
        if (btn) {
            if (cat === category) {
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
    
    renderBancada();
}

function renderBancada() {
    const recipesContainer = document.getElementById('bancada-recipes-list');
    if (!recipesContainer) return;
    recipesContainer.innerHTML = '';
    
    let recipesToRender = bancadaRecipes;
    if (currentBancadaFilter !== 'all') {
        recipesToRender = bancadaRecipes.filter(r => r.category === currentBancadaFilter);
    }
    
    recipesToRender.forEach(recipe => {
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
        
        const maxCraftable = getMaxCraftableQty(recipe);
        const maxCraftableText = maxCraftable > 0 
            ? `<strong style="color: var(--accent-green);">${maxCraftable} u.</strong>` 
            : `<span style="color: var(--text-muted); font-weight: normal;">0 u.</span>`;
        
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
            : `<button class="btn btn-cyan" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="craftBancadaItem('${recipe.id}')"><i class="ri-hammer-line"></i> Montar</button>`;
        
        const cardHTML = `
            <div class="printer-card" style="${cardStyle}">
                <div class="printer-card-left">
                    <div class="printer-card-icon-box" style="background: rgba(0, 240, 255, 0.07); border-color: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.3));">
                        <i class="ri-hammer-line"></i>
                    </div>
                    <div class="printer-card-info">
                        <h4 style="font-style: italic; display: flex; align-items: center;">${lockIcon} ${recipe.name} &nbsp; ${lockBadge}</h4>
                        <div class="printer-card-meta">
                            Tempo: <strong>${recipe.time}</strong> | Materiais: ${ingredientsHTML}<br>
                            Skill: <strong>${recipe.skill}</strong> | XP Req: <strong>${recipe.xp}</strong> | No estoque: <strong style="color: var(--accent-cyan);">${currentStock} u.</strong> | Pode montar: ${maxCraftableText}
                        </div>
                    </div>
                </div>
                
                <div class="printer-card-actions">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="number" id="bancada-qty-${recipe.id}" value="1" min="1" style="width: 50px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 4px; border-radius: 4px; text-align: center;" ${isLocked ? 'disabled' : ''}>
                        ${printButton}
                    </div>
                </div>
            </div>
        `;
        recipesContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function craftBancadaItem(recipeId) {
    const recipe = bancadaRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    // Check lock
    const userXP = state.playerXP || 0;
    if (!state.bypassXP && userXP < recipe.xp) {
        showToast(`XP insuficiente! Este item requer ${recipe.xp} XP.`, 'error');
        return;
    }
    
    const qtyInput = document.getElementById(`bancada-qty-${recipeId}`);
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
            category: 'bancada',
            type: 'other',
            qty: multiplier,
            minQty: 5,
            label: recipe.name.substring(0, 2).toUpperCase()
        });
    }
    
    // Log financial transaction (0 cost)
    state.transactions.unshift({
        id: 't-bancada-' + Date.now(),
        desc: `Montado (Bancada): ${multiplier}x ${recipe.name}`,
        type: 'income',
        category: 'Bancada de Trabalho',
        value: 0,
        date: new Date().toISOString()
    });
    
    showToast(`Montagem concluída: ${multiplier}x ${recipe.name}!`);
    updateUI();
}

/* ==========================================================================
   CONVERSÃO BRUTO PARA FORJADO LOGIC
   ========================================================================== */

function renderConversao() {
    const minerals = ['cobre', 'ferro', 'prata', 'aco', 'titanio'];
    minerals.forEach(min => {
        const brutoId = min === 'titanio' ? 'titanio_bruto' : `${min}_bruto`;
        const forgedId = min === 'titanio' ? 'titanio_forjado' : `${min}_forjado`;
        
        const wBruto = document.getElementById(`conv-stock-${brutoId}`);
        const wForged = document.getElementById(`conv-stock-${forgedId}`);
        
        if (wBruto) wBruto.textContent = `${getStockQty(brutoId)} u.`;
        if (wForged) wForged.textContent = `${getStockQty(forgedId)} u.`;
    });
}

function updateConversionResult(mineral) {
    const input = document.getElementById(`conv-qty-${mineral}`);
    const resultDiv = document.getElementById(`conv-result-${mineral}`);
    if (!input || !resultDiv) return;
    
    const qty = parseInt(input.value) || 0;
    const forgedQty = Math.floor(qty / 2);
    
    let html = `+${forgedQty} Forjado`;
    if (qty % 2 !== 0 && qty > 0) {
        html += `<br><span style="font-size: 0.72rem; color: var(--accent-orange); font-weight: normal;">(Sobrará 1 Bruto)</span>`;
    }
    
    resultDiv.innerHTML = html;
}

function executeConversion(brutoId, forgedId, mineral) {
    const input = document.getElementById(`conv-qty-${mineral}`);
    if (!input) return;
    
    const qty = parseInt(input.value) || 0;
    if (qty <= 0) {
        showToast("Insira uma quantidade maior que zero para converter.", "error");
        return;
    }
    
    // If odd, we convert the even quantity (qty - 1), yielding (qty - 1) / 2 forged, leaving 1 raw
    const convertQty = qty % 2 === 0 ? qty : qty - 1;
    const yieldQty = convertQty / 2;
    
    if (convertQty === 0) {
        showToast("Você precisa de pelo menos 2 minérios brutos para realizar a conversão.", "error");
        return;
    }
    
    const stockBruto = state.inventory.find(i => i.id === brutoId);
    const stockForged = state.inventory.find(i => i.id === forgedId);
    
    if (!stockBruto || stockBruto.qty < convertQty) {
        showToast(`Estoque de minério bruto insuficiente! Você tem ${stockBruto ? stockBruto.qty : 0} u.`, "error");
        return;
    }
    
    // Deduct raw & Add forged
    stockBruto.qty -= convertQty;
    if (stockForged) {
        stockForged.qty += yieldQty;
    } else {
        state.inventory.push({
            id: forgedId,
            name: brutoId.replace('_bruto', ' Forjado').replace('titanio_forjado', 'Barra de Titânio'),
            category: 'mineracao',
            type: 'forged',
            qty: yieldQty,
            minQty: 5,
            label: forgedId.substring(0, 2).toUpperCase() + '+'
        });
    }
    
    // Log transaction
    state.transactions.unshift({
        id: 't-conv-' + Date.now(),
        desc: `Fundição: ${convertQty}x ${stockBruto.name} → ${yieldQty}x ${stockForged ? stockForged.name : forgedId}`,
        type: 'income',
        category: 'Outros',
        value: 0,
        date: new Date().toISOString()
    });
    
    input.value = 0;
    updateConversionResult(mineral);
    
    let msg = `Conversão concluída! ${convertQty}x Bruto transformados em ${yieldQty}x Forjado.`;
    if (qty % 2 !== 0) {
        msg += ` (1 Bruto restante sobrou no estoque)`;
    }
    showToast(msg);
    updateUI();
    saveToLocalStorage();
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
        const isDefaultBancada = item.category === 'bancada';
        const isFixo = isDefaultMining || isDefault3D || isDefaultKitchen || isDefaultMoinho || isDefaultPo || isDefaultBancada;
        
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
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="number" id="insert-qty-${item.id}" value="0" min="0" style="width: 60px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 4px; border-radius: 4px; text-align: center;">
                        <button class="qty-btn" onclick="addStockInputQty('${item.id}', false)" title="Inserir no estoque" style="background: rgba(46, 204, 113, 0.15); border-color: #2ecc71; color: #2ecc71;"><i class="ri-add-line"></i></button>
                        <button class="qty-btn" onclick="addStockInputQty('${item.id}', true)" title="Remover do estoque" style="background: rgba(231, 76, 60, 0.15); border-color: #e74c3c; color: #e74c3c;"><i class="ri-subtract-line"></i></button>
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

function addStockInputQty(itemId, isSubtract = false) {
    const item = state.inventory.find(i => i.id === itemId);
    const input = document.getElementById(`insert-qty-${itemId}`);
    if (item && input) {
        const val = parseInt(input.value) || 0;
        if (val < 0) {
            showToast("Quantidade inválida.", "error");
            return;
        }
        if (val === 0) {
            showToast("Insira uma quantidade maior que zero para ajustar.", "warning");
            return;
        }
        if (isSubtract) {
            if (item.qty < val) {
                showToast(`Quantidade insuficiente! Você só possui ${item.qty} u. em estoque.`, "error");
                return;
            }
            item.qty -= val;
            showToast(`Removidos ${val}x ${item.name} do estoque.`, "warning");
        } else {
            item.qty += val;
            showToast(`Adicionados ${val}x ${item.name} ao estoque.`, "success");
        }
        input.value = "0";
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
    { name: 'Volante de Motor Bruto', section: 'impressorapo', label: 'Imp. Industrial de Pó' },
    
    // Bancada de Trabalho
    { name: 'Coletor Admissão Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coletor Admissão Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coletor Admissão Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coletor Admissão Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Corpo Borboleta Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Corpo Borboleta Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Corpo Borboleta Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Corpo Borboleta Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Escape Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Biela Forjada OEM', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Biela H-Beam', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Biela Titânio', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bloco Alumínio', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bloco Billet', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bloco Ferro Fundido', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bomba Combustível Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bomba Combustível Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bomba Combustível Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Bomba Combustível Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Cabeçote Alumínio', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Cabeçote CNC Billet', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Cabeçote Ferro', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coroa e Pinhão Aceleração', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coroa e Pinhão Balanceado', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coroa e Pinhão Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Coroa e Pinhão Velocidade', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Câmbio Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Câmbio Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Câmbio Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Comando Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Comando Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Comando Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Comando Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'ECU Ecumaster', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'ECU FT550', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'ECU FT700', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'ECU FT700 Plus', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'ECU Octtane Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'ECU RACE DASH', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Intercooler Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Intercooler Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Intercooler Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Intercooler Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Junta Cabeçote Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Junta Cabeçote Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Junta Cabeçote Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Junta Cabeçote Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Diferencial Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Diferencial Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Diferencial Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Diferencial Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Pistão Forjado', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Pistão Fundido', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Pistão Titânio', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Placa Conectora de ECU', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Placa ECU Ecumaster', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Placa ECU Octtane', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Óleo Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Óleo Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Óleo Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Radiador Óleo Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Biturbo Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Biturbo Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Turbo Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Turbo Race Mid', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Turbo Race Top', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Turbo Street Low', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Turbo Street Mid', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Twin Turbo Drag', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Twin Turbo Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Vela Ignição Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Virabrequim Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Virabrequim Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Virabrequim Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Virabrequim Track', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Volante Motor Prototype', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Volante Motor Race', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Volante Motor Street', section: 'bancada', label: 'Bancada de Trabalho' },
    { name: 'Volante Motor Track', section: 'bancada', label: 'Bancada de Trabalho' }
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
    
    if (sectionId === 'bancada') {
        const itemRecipe = bancadaRecipes.find(r => r.name.toLowerCase() === itemName.toLowerCase());
        if (itemRecipe) {
            filterBancada(itemRecipe.category);
        } else {
            filterBancada('all');
        }
    }
    
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

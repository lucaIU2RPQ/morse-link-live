const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { level, mode, botCallsign, botName, botQTH, messages } = JSON.parse(event.body);
        
        // Build system prompt based on configuration
        const systemPrompt = buildSystemPrompt(level, mode, botCallsign, botName, botQTH);
        
        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                system: systemPrompt,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', errorText);
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.content[0].text;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ response: botResponse })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

function buildSystemPrompt(level, mode, botCallsign, botName, botQTH) {
    const levelInstructions = {
        'beginner': 'Rispondi lentamente (10-12 WPM simulato), usa frasi brevi, solo abbreviazioni CW comuni (TNX, FB, 73, K, SK). Sii paziente e incoraggiante.',
        'intermediate': 'Rispondi a velocità media (15-18 WPM simulato), conversazione naturale, abbreviazioni standard. Sii amichevole ma efficiente.',
        'advanced': 'Rispondi velocemente (20-25 WPM simulato), usa abbreviazioni avanzate, Q-code, prosigns. Simula occasionalmente QSB (fading). Sii conciso e professionale.'
    };
    
    const modeInstructions = {
        'ragchew': 'Modalità RAGCHEW: Conversa in modo rilassato e dettagliato. Chiedi del meteo, dell\'apparato, dell\'antenna, degli interessi. Condividi informazioni sulla tua stazione. Fai durare il QSO con domande e commenti interessanti.',
        'contest': 'Modalità CONTEST: Scambi rapidissimi. Solo: callsign, report RST, numero progressivo. Esempio: "IU2RPQ 599 001 TU". Niente conversazione. Solo "TU" (thank you) e prosegui. Sii estremamente conciso.',
        'dx': 'Modalità DX: Simula condizioni difficili. Occasionalmente chiedi ripetizioni (AGN? PSE RPT?). Pile-up simulato (altri stanno chiamando). Sii breve ma educato. Difficoltà di propagazione.',
        'sota': 'Modalità SOTA/POTA: Sei su una cima montana (SOTA) o in un parco (POTA). Menziona la referenza (es: I/LO-001), condizioni meteo in vetta, QRP (bassa potenza), batterie, antenna temporanea. Enfatizza l\'aspetto outdoor.',
        'emergency': 'Modalità EMERGENCY: Simula traffico di emergenza. Usa procedure formali. Chiedi "QRU?" (hai traffico?). Usa priorità, messaggi strutturati. Serio e professionale. Coordina come in vera emergenza.'
    };
    
    return `Sei un operatore radioamatoriale virtuale con indicativo ${botCallsign}, nome ${botName}, località ${botQTH}.

ISTRUZIONI FONDAMENTALI:
- Comunica SOLO usando abbreviazioni e codici CW standard
- NON usare MAI frasi complete in italiano normale
- USA abbreviazioni come: CQ, DE, K, TNX, FB, OM, YL, RST, QTH, WX, RIG, ANT, 73, 88, SK, PSE, AGN, QSL, etc.
- Esempio CORRETTO: "GM OM TNX CALL = UR RST 599 = NAME ${botName} = QTH ${botQTH} = HW? K"
- Esempio SBAGLIATO: "Buongiorno, grazie per la chiamata, come stai?"

${levelInstructions[level]}

${modeInstructions[mode]}

PROCEDURA QSO STANDARD:
1. Prima trasmissione: "CQ CQ CQ DE ${botCallsign} K"
2. Risposta a chiamata: dare RST, nome, QTH
3. Ragtime: discutere WX, RIG, ANT, PWR
4. Chiusura: "TNX QSO = 73 = ${botCallsign} SK"

IMPORTANTE:
- Rispondi SEMPRE in stile CW abbreviato
- Usa "=" per separare i concetti (equivale a pausa)
- Termina messaggi con "K" (passo a te) o "SK" (fine QSO)
- Sii realistico: come un vero operatore radio
- L'utente è IU2RPQ, nome LUCA, da MODENA

Mantieni il personaggio e lo stile CW in ogni messaggio!`;
}

/*
 * MIT License
 *
 * Copyright (c) 2025
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
  VALIDADOR WHATSAPP (SOLO ARCHIVO)
  ---------------------------------
  Descripción:
  1. Permite crear una sesión de WhatsApp o usar una existente (utiliza Baileys).
  2. Valida números de teléfono en un archivo .txt, detectando si tienen WhatsApp.
  3. Guarda resultados en un archivo .csv evitando colisiones con archivos previos.
  4. Esta versión deja sólo la columna "phone" y "validate" en el CSV (true/false).
*/

/* ------------------------------------------------------------
 * IMPORTS
 * ---------------------------------------------------------- */
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const readline = require('readline');

/* ------------------------------------------------------------
 * CLASE: CLIENTE WHATSAPP (BAILEYS)
 * ---------------------------------------------------------- */
class WhatsAppClient {
  constructor(sessionName) {
    this.sessionName = sessionName;
    this.sock = null;
    this.isReady = false;
  }

  /**
   * Inicializa la sesión de WhatsApp y maneja la reconexión en caso de cierre.
   */
  async initialize() {
    const authDir = path.join(__dirname, 'auth', this.sessionName);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false
    });

    // Escuchamos eventos de conexión
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Presentar QR en consola
      if (qr) {
        console.clear();
        console.log(`\n[Sesión: ${this.sessionName}] Escanea este código QR:\n`);
        qrcode.generate(qr, { small: true });
      }

      // Manejo de cierre de conexión
      if (connection === 'close') {
        const isBoom = lastDisconnect?.error instanceof Boom;
        const statusCode = isBoom ? lastDisconnect.error.output.statusCode : 0;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[Sesión: ${this.sessionName}] Conexión cerrada. Reintentando: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => this.initialize(), 5000);
        } else {
          console.log(`[Sesión: ${this.sessionName}] Cierre definitivo. Elimina "auth/${this.sessionName}" para volver a conectar.`);
        }
      } else if (connection === 'open') {
        console.log(`[Sesión: ${this.sessionName}] Conectada exitosamente.`);
        this.isReady = true;
      }
    });

    // Escuchamos actualización de credenciales
    this.sock.ev.on('creds.update', saveCreds);
  }

  /**
   * Da formato a un número de teléfono para que sea válido en WhatsApp (ej. para Argentina).
   * Ajusta según tu país si necesitas otro formato.
   */
  formatPhoneNumber(phone) {
    const raw = String(phone);
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    // Ajuste para Argentina (ejemplo). Modifícalo para tu lógica local.
    if (digits.startsWith('0')) {
      let mod = digits.replace(/^0+/, '549');
      // Remueve '15' si aparece justo después de '54911'
      mod = mod.replace(/^54911(15)/, '54911');
      return mod;
    }

    return digits;
  }

  /**
   * Verifica si un número está registrado en WhatsApp.
   */
  async validateNumber(number) {
    if (!this.isReady) {
      return { hasWhatsApp: false, reason: 'client_not_ready' };
    }
    try {
      const jid = `${number}@s.whatsapp.net`;
      const results = await this.sock.onWhatsApp(jid);
      const found = Array.isArray(results) && results.length > 0;
      return { hasWhatsApp: found };
    } catch (err) {
      return { hasWhatsApp: false, error: err.message };
    }
  }
}

/* ------------------------------------------------------------
 * FUNCIONES DE UTILIDAD
 * ---------------------------------------------------------- */

/**
 * Ofrece al usuario la posibilidad de escoger una sesión de WhatsApp existente
 * o crear una nueva.
 */
async function selectOrCreateSession() {
  const authBase = path.join(__dirname, 'auth');
  if (!fs.existsSync(authBase)) {
    fs.mkdirSync(authBase);
  }

  // Listamos directorios dentro de /auth
  const sessions = fs.readdirSync(authBase).filter((f) => {
    const fullPath = path.join(authBase, f);
    return fs.lstatSync(fullPath).isDirectory();
  });

  const choices = [
    ...sessions.map((s) => ({ name: `Use existing session: ${s}`, value: s })),
    { name: 'Create new session...', value: '__new__' }
  ];

  const { chosen } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosen',
      message: 'Select a WhatsApp session:',
      choices
    }
  ]);

  if (chosen === '__new__') {
    const { newName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newName',
        message: 'Enter a name for the new session:',
        validate: (input) => input.trim() !== '' || 'Name cannot be empty.'
      }
    ]);
    return newName.trim();
  } else {
    return chosen;
  }
}

/**
 * Genera un nombre de archivo CSV disponible para guardar resultados, evitando colisiones
 * con archivos existentes en el directorio.
 */
function getAvailableResultsFileName(baseTxtFile) {
  const extension = path.extname(baseTxtFile);
  const baseNameNoExt = baseTxtFile.replace(extension, '');
  let candidate = `${baseNameNoExt}_results.csv`;
  let counter = 1;

  // Mientras exista un archivo con el mismo nombre, incrementamos un sufijo numérico
  while (fs.existsSync(candidate)) {
    counter++;
    candidate = `${baseNameNoExt}_results${counter}.csv`;
  }
  return candidate;
}

/**
 * Lee un archivo .txt, valida cada teléfono vía WhatsApp y genera un archivo CSV con los resultados.
 */
async function handleTxtFileValidation(waClient) {
  const currentDir = process.cwd();
  const files = fs.readdirSync(currentDir);

  // Permitimos seleccionar un archivo .txt existente
  const { chosenFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosenFile',
      message: 'Select a file from the current directory:',
      choices: files
    }
  ]);

  // Verificamos extensión
  const ext = path.extname(chosenFile).toLowerCase();
  if (ext !== '.txt') {
    console.log('The selected file is not .txt. No validation performed.');
    return;
  }

  // Determinamos el archivo CSV de salida
  const outputFilePath = getAvailableResultsFileName(chosenFile);

  // Creamos un stream hacia el CSV y escribimos la cabecera
  // En esta versión sólo guardamos la columna de teléfono y el estado de validación en inglés
  const outputStream = fs.createWriteStream(outputFilePath, { flags: 'a' });
  outputStream.write('phone,validate\n');

  // Inicializamos la sesión de WhatsApp
  await waClient.initialize();
  while (!waClient.isReady) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\nStarting phone validation for file: ${chosenFile}`);
  console.log(`Results will be stored in: ${outputFilePath}`);

  // Leemos el archivo .txt línea a línea
  const fileStream = fs.createReadStream(chosenFile, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  // Procesamos cada línea (número de teléfono)
  for await (const line of rl) {
    const rawPhone = line.trim();
    if (!rawPhone) continue; // Ignoramos líneas vacías

    const formatted = waClient.formatPhoneNumber(rawPhone);
    let validate = false;

    // Validamos el número si tiene formato
    if (formatted) {
      const validation = await waClient.validateNumber(formatted);
      validate = !!validation.hasWhatsApp; // true or false
    }

    // Guardamos la línea en CSV
    outputStream.write(`${formatted},${validate}\n`);

    // Mostramos resultado en consola para tener feedback en “tiempo real”
    console.log(
      `Validated: ${rawPhone} -> ${formatted || 'N/A'} => ${
        validate ? 'true' : 'false'
      }`
    );
  }

  // Cerramos streams
  rl.close();
  outputStream.end();
  console.log('\nReading and validation finished.');
}

/* ------------------------------------------------------------
 * PROGRAMA PRINCIPAL
 * ---------------------------------------------------------- */
(async () => {
  console.log('========================================');
  console.log('   WHATSAPP VALIDATOR (FILE-BASED)      ');
  console.log('========================================');

  try {
    // Menú principal: validar archivo .txt o salir
    const { mainOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mainOption',
        message: 'What do you want to do?',
        choices: [
          { name: '1. Validate phones from a .txt file', value: '1' },
          { name: '2. Exit program', value: '2' }
        ]
      }
    ]);

    if (mainOption === '2') {
      console.log('Exiting program...');
      process.exit(0);
    }

    // Si eligió validar un archivo, primero seleccionamos (o creamos) la sesión de WhatsApp
    const sessionName = await selectOrCreateSession();
    const waClient = new WhatsAppClient(sessionName);

    // Llamamos a la funcionalidad de validación vía archivo .txt
    await handleTxtFileValidation(waClient);

  } catch (error) {
    console.error('General execution error:', error.message || error);
    process.exit(1);
  }
})();

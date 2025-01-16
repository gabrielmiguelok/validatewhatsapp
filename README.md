# WhatsApp Validator (FILE-BASED)

Automatiza la validación de números de teléfono, confirmando si cuentan con una cuenta de WhatsApp activa.  
Este repositorio se basa en [Baileys](https://github.com/WhiskeySockets/Baileys) para interactuar con WhatsApp Web y permite procesar grandes volúmenes de números desde un archivo `.txt`, exportando los resultados en un `.csv`.

---

## Características

- **Sesiones de WhatsApp**: Crea una sesión nueva o reutiliza una existente, facilitando la gestión de múltiples validaciones.  
- **Validación en lote**: Procesa varios números desde un archivo `.txt`.  
- **Resultados en CSV**: Genera un archivo `.csv` con dos columnas: `phone` y `validate`.  
- **Formato de números**: Realiza ajustes de formato antes de validar, permitiendo personalizar la lógica local.  
- **Evita colisiones**: Si ya existe un archivo de resultados, genera otro con un sufijo incremental.

---

## Requisitos

### Software necesario

- **Node.js** (v14 o superior) – [Descargar Node.js](https://nodejs.org/)  
- **npm** (v6 o superior) – Se instala automáticamente con Node.js  

### Dependencias

Este proyecto emplea las siguientes librerías:

- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) para conexión y manejo de WhatsApp.  
- [inquirer](https://github.com/SBoudrias/Inquirer.js) para la interacción en consola.  
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) para mostrar códigos QR en la terminal.  
- [pino](https://github.com/pinojs/pino) para registro de logs.  
- [@hapi/boom](https://github.com/hapijs/boom) para manejo de excepciones HTTP-friendly.

---

## Instalación

Para clonar este repositorio y ejecutarlo en tu máquina local, sigue estos pasos:

1. **Clona el repositorio**:

   ```bash
   git clone https://github.com/gabrielmiguelok/validatewhatsapp.git
   cd validatewhatsapp

1. **Instala las dependencias**:

    ```bash
    npm install

    ```

2. **Ejecuta el script principal**:

    ```bash
    node validatewhatsapp.js

    ```

    Esto iniciará el programa en tu terminal.


---

## Uso

1. **Selecciona o crea una sesión de WhatsApp**
    - Puedes reutilizar una sesión existente para evitar escanear el código QR en cada ejecución.
    - Si eliges crear una sesión nueva, ingresa un nombre (por ejemplo, `session1`) y escanea el código QR que aparece.
2. **Procesar un archivo `.txt`**
    - Coloca en el mismo directorio del programa un archivo `.txt` con un número de teléfono por línea.
    - El script leerá cada número, lo formateará (ejemplo: lógica de Argentina) y validará si existe en WhatsApp.
    - El resultado se guardará en un archivo `.csv` (por ejemplo, `numeros_results.csv`), con las columnas `phone` y `validate`.
3. **Interpretar resultados**
    - `phone`: Muestra el número formateado listo para WhatsApp.
    - `validate`: Indica `true` si el número tiene WhatsApp, o `false` en caso contrario.

### Principios SOLID y Buenas Prácticas

**Este proyecto se desarrolla aplicando los siguientes principios:**

1. **SRP (Responsabilidad Única)**: Cada clase y función se centra en una sola tarea (por ejemplo, `WhatsAppClient` para conexiones).
2. **OCP (Abierto/Cerrado)**: Se pueden añadir nuevas funcionalidades (p. ej., logs personalizados) sin modificar las clases base.
3. **LSP (Sustitución de Liskov)**: Las subclases o implementaciones pueden reemplazar componentes base sin afectar el sistema.
4. **ISP (Segregación de Interfaces)**: Se utilizan métodos e interfaces concretas; no se agregan funcionalidades innecesarias.
5. **DIP (Inversión de Dependencias)**: El programa depende de abstracciones, reduciendo el acoplamiento.

Además, se respetan principios como **KISS**, **DRY**, **SoC**, **Dependency Injection**, **Alta Cohesión / Bajo Acoplamiento**, **Encapsulación**, **Principio de Menor Sorpresa**, **Composición sobre Herencia**, **Clean Code**, **Auto-documentado**, **Refactorización Continua**, **SSOT**, **Fail Fast**, **Menor Privilegio**, **Ley de Deméter** y **Gestión robusta de excepciones** para asegurar un código claro y mantenible.

---

### Contribuciones

**¡Las contribuciones son bienvenidas! Para contribuir:**

1. Haz un **fork** de este repositorio.
2. Crea una **nueva rama** (`feature/nueva-funcionalidad`).
3. Realiza tus cambios y comprueba que todo funcione.
4. Abre un **pull request** detallando los cambios realizados.

---

### Licencia

Este proyecto está licenciado bajo la [Licencia MIT](https://www.notion.so/synara/LICENSE). Puedes usarlo libremente para fines personales y comerciales, siempre que se incluya la nota de licencia original.

---

### Contacto

Para dudas, sugerencias o reportar problemas, no dudes en abrir un **issue** en el repositorio o comunicarte con el autor:

- **GitHub**: [gabrielmiguelok](https://github.com/gabrielmiguelok)
- **Correo**: [ceo@synara.ar](mailto:ceo@synara.ar)
- **LinkedIn**: [gabrielmiguelok](https://www.linkedin.com/in/gabrielmiguelok/)

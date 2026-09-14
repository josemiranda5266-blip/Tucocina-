import React from 'react';
import { ArrowLeft, FileText, ShieldCheck, Cookie, Copyright } from 'lucide-react';

export type LegalSection = 'privacy' | 'terms' | 'cookies' | 'content';

interface LegalPageProps {
  section: LegalSection;
  onNavigate: (view: string, param?: string) => void;
}

const sections: Array<{ id: LegalSection; label: string; icon: React.ReactNode }> = [
  { id: 'privacy', label: 'Privacidad', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'terms', label: 'Términos de uso', icon: <FileText className="w-4 h-4" /> },
  { id: 'cookies', label: 'Cookies y analítica', icon: <Cookie className="w-4 h-4" /> },
  { id: 'content', label: 'Contenido y propiedad intelectual', icon: <Copyright className="w-4 h-4" /> },
];

const effectiveDate = '14 de septiembre de 2026';
const contactEmail = 'contacto@cociflash.com';

export const LegalPage: React.FC<LegalPageProps> = ({ section, onNavigate }) => (
  <div className="max-w-5xl mx-auto">
    <button type="button" onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 text-sm text-amber-800 hover:text-amber-950 font-semibold mb-6"><ArrowLeft className="w-4 h-4" /> Volver a CociFlash</button>
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-6 sm:px-10 pt-8 pb-5 border-b border-stone-200">
        <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">CociFlash · Información legal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-stone-900">{sections.find((item) => item.id === section)?.label}</h1>
        <p className="mt-2 text-sm text-stone-500">Vigente desde {effectiveDate}. Versión legal 2026-09-14.</p>
      </div>
      <div className="flex flex-wrap gap-2 px-6 sm:px-10 py-4 bg-stone-50 border-b border-stone-200">
        {sections.map((item) => <button key={item.id} type="button" onClick={() => onNavigate('legal', item.id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${section === item.id ? 'bg-amber-600 text-white' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'}`}>{item.icon}{item.label}</button>)}
      </div>
      <article className="px-6 sm:px-10 py-8 prose prose-stone max-w-none prose-headings:text-stone-900 prose-a:text-amber-800">
        {section === 'privacy' && <PrivacyContent />}
        {section === 'terms' && <TermsContent />}
        {section === 'cookies' && <CookiesContent />}
        {section === 'content' && <ContentContent />}
      </article>
    </div>
  </div>
);

const PrivacyContent = () => (
  <>
    <h2>1. Responsable y alcance</h2>
    <p>CociFlash es una plataforma web orientada a descubrir, buscar y organizar videos públicos de recetas publicados en plataformas de terceros. Esta política explica qué información puede tratar CociFlash cuando una persona utiliza el sitio, crea una cuenta o interactúa con sus funciones.</p>
    <p>La información se trata de acuerdo con la normativa aplicable en materia de protección de datos personales, incluyendo la Ley 25.326 y sus normas complementarias.</p>

    <h2>2. Datos que podemos tratar</h2>
    <ul>
      <li><strong>Cuenta:</strong> identificador de usuario, nombre visible, dirección de correo electrónico y foto de perfil proporcionados por Google/Firebase Authentication cuando elegís iniciar sesión con Google.</li>
      <li><strong>Actividad dentro de CociFlash:</strong> favoritos, reportes, comentarios y otras acciones necesarias para prestar las funciones solicitadas.</li>
      <li><strong>Preferencias y cumplimiento:</strong> registro de la versión legal aceptada y la fecha/hora de aceptación.</li>
      <li><strong>Analítica:</strong> identificadores anónimos o seudónimos de visitante y sesión, páginas visitadas, búsquedas, reproducciones, favoritos, compartidos y otros eventos agregados.</li>
      <li><strong>Datos técnicos:</strong> información técnica necesaria para seguridad, funcionamiento y medición, como tipo de dispositivo y determinados encabezados proporcionados por la infraestructura.</li>
    </ul>
    <p>CociFlash no solicita deliberadamente datos sensibles para prestar su servicio y no debe utilizarse para introducir datos sensibles en campos de texto.</p>

    <h2>3. Para qué utilizamos la información</h2>
    <ul><li>Autenticar usuarios y mantener sus cuentas.</li><li>Guardar favoritos, comentarios y gestionar reportes.</li><li>Proteger la plataforma frente a abusos y mantener su seguridad.</li><li>Registrar la aceptación de las condiciones legales aplicables.</li><li>Comprender el uso general del sitio mediante estadísticas agregadas.</li><li>Mejorar las funciones, navegación y catálogo.</li><li>Cumplir obligaciones legales cuando corresponda.</li></ul>

    <h2>4. Proveedores y terceros</h2>
    <p>CociFlash utiliza servicios tecnológicos de terceros para operar la plataforma, entre ellos Google/Firebase para autenticación y almacenamiento, Render para alojamiento del servidor y Cloudflare para infraestructura de dominio/DNS y correo de recepción. Los videos permanecen en las plataformas de origen y pueden utilizar sus propios mecanismos de seguimiento y políticas de privacidad.</p>
    <p>Cuando seguís un enlace o utilizás un reproductor de una plataforma externa, esa plataforma puede tratar información directamente bajo sus propias condiciones.</p>

    <h2>5. Conservación, eliminación y seguridad</h2>
    <p>Conservamos la información durante el tiempo necesario para prestar el servicio, mantener registros operativos, atender reportes y cumplir obligaciones legales. La cuenta dispone de una opción para solicitar la eliminación de la cuenta y de los datos de primera parte asociados, incluyendo perfil, favoritos, reportes y comentarios asociados. Los eventos de analítica agregados no están vinculados directamente con la identidad de la cuenta y pueden conservarse como estadísticas anónimas.</p>
    <p>Aplicamos controles de autenticación, autorización y medidas técnicas razonables para proteger la información. Ningún sistema conectado a Internet puede garantizar seguridad absoluta.</p>

    <h2>6. Derechos de las personas</h2>
    <p>De acuerdo con la normativa argentina aplicable, podés solicitar acceso, rectificación, actualización o supresión de tus datos personales, además de ejercer los demás derechos que correspondan. El canal oficial de CociFlash es <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Las solicitudes pueden requerir verificación de identidad para evitar accesos indebidos.</p>

    <h2>7. Contacto</h2>
    <p>Para solicitudes de privacidad, eliminación de datos, reclamos sobre contenido o consultas generales: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>

    <h2>8. Cambios</h2>
    <p>Podemos actualizar esta política cuando cambien las funciones, proveedores o requisitos legales. La fecha y versión de vigencia permiten identificar la versión aplicable. Si una actualización requiere un consentimiento específico, se solicitará nuevamente.</p>
  </>
);

const TermsContent = () => (
  <>
    <h2>1. Objeto</h2><p>CociFlash ofrece herramientas para descubrir, buscar, organizar y reproducir o abrir referencias a videos de recetas disponibles en servicios de terceros. El servicio puede modificarse, ampliarse o discontinuarse parcialmente cuando resulte necesario.</p>
    <h2>2. Cuenta de usuario</h2><p>Algunas funciones requieren autenticación mediante Google. La persona usuaria es responsable de utilizar su cuenta legítimamente y de no intentar acceder a cuentas, datos o funciones que no le correspondan.</p>
    <h2>3. Aceptación</h2><p>Para utilizar una cuenta se solicita una aceptación expresa de estos Términos de Uso y de la Política de Privacidad. CociFlash registra la versión legal y la fecha/hora de esa aceptación para mantener constancia de la versión aceptada.</p>
    <h2>4. Uso aceptable</h2><p>No está permitido utilizar CociFlash para actividades ilícitas, fraude, abuso, extracción automatizada que perjudique el servicio, evasión de medidas de seguridad, distribución de malware o envío deliberado de información falsa o abusiva.</p>
    <h2>5. Disponibilidad</h2><p>CociFlash se proporciona en función de la disponibilidad de su infraestructura y de las plataformas externas. No garantizamos disponibilidad permanente ni que todos los videos externos permanezcan publicados, sean reproducibles o estén disponibles en todos los países.</p>
    <h2>6. Contenido de terceros</h2><p>Los videos, imágenes, nombres, marcas y demás contenidos de terceros pertenecen a sus respectivos titulares. CociFlash no afirma ser propietario de esos contenidos ni representa a sus autores o plataformas de origen.</p>
    <h2>7. Reportes y moderación</h2><p>CociFlash puede revisar y retirar de su catálogo referencias que infrinjan estos términos, derechos de terceros, normas de las plataformas de origen o la legislación aplicable. Un reporte no implica que el contenido sea ilícito ni garantiza su retiro inmediato.</p>
    <h2>8. Propiedad de CociFlash</h2><p>El software, diseño, textos originales, estructura del catálogo y elementos propios de CociFlash pertenecen a sus respectivos titulares y no pueden copiarse o explotarse fuera de los usos permitidos por la legislación aplicable.</p>
    <h2>9. Eliminación de cuenta</h2><p>La persona usuaria puede solicitar la eliminación de su cuenta desde la propia aplicación. La eliminación afecta los datos de primera parte asociados que CociFlash pueda eliminar técnicamente, sin perjuicio de registros que deban conservarse por obligación legal o de estadísticas agregadas que no permitan identificar directamente a la persona.</p>
    <h2>10. Modificaciones</h2><p>Podemos actualizar estos términos cuando cambien las funciones, proveedores o requisitos legales. Cuando una modificación requiera un consentimiento específico, se solicitará de forma correspondiente.</p>
    <h2>11. Legislación</h2><p>Estos términos se interpretarán conforme a la legislación argentina aplicable, sin perjuicio de los derechos irrenunciables que correspondan a las personas usuarias conforme a la normativa vigente.</p>
  </>
);

const CookiesContent = () => (
  <>
    <h2>1. Qué tecnologías utiliza CociFlash</h2><p>CociFlash utiliza tecnologías de almacenamiento local y mecanismos de sesión para mantener funciones del sitio y medir su utilización. Actualmente la analítica propia utiliza un identificador aleatorio de visitante guardado localmente y un identificador de sesión que se renueva después de un período de inactividad.</p>
    <h2>2. Qué medimos</h2><p>Podemos registrar eventos agregados como visitas de página, apertura y reproducción de videos, búsquedas, favoritos, compartidos, inicios de sesión y registros. También pueden registrarse de forma agregada el tipo de dispositivo y, cuando la infraestructura lo proporciona, el país de conexión.</p>
    <h2>3. Para qué</h2><p>La finalidad es conocer el funcionamiento y utilización general de CociFlash, detectar problemas, mejorar la experiencia y evaluar qué contenidos y funciones son útiles. La analítica propia está diseñada para evitar almacenar deliberadamente direcciones IP completas o correos electrónicos como parte de los eventos.</p>
    <h2>4. Servicios externos</h2><p>Los reproductores, enlaces y servicios de terceros pueden utilizar sus propias cookies, almacenamiento o tecnologías de seguimiento. Esos tratamientos dependen de la plataforma correspondiente y no están controlados por CociFlash.</p>
    <h2>5. Control del usuario</h2><p>Podés eliminar los datos de almacenamiento local desde la configuración del navegador. Esto puede generar un nuevo identificador anónimo y afectar algunas mediciones, pero no elimina por sí mismo los datos de una cuenta de CociFlash almacenados en el servidor.</p>
  </>
);

const ContentContent = () => (
  <>
    <h2>1. Naturaleza del contenido</h2><p>CociFlash organiza referencias a videos de recetas publicados por terceros. La disponibilidad pública de una obra en Internet no significa por sí sola que su autor haya renunciado a sus derechos. La Ley 11.723 protege las obras y sus titulares.</p>
    <h2>2. Videos y plataformas de origen</h2><p>CociFlash procura utilizar mecanismos de reproducción, enlaces o integraciones compatibles con las plataformas de origen. No descarga ni pretende apropiarse de los videos de terceros como si fueran contenido propio.</p>
    <h2>3. Marcas y nombres</h2><p>YouTube, Instagram, TikTok, sus logotipos y las demás marcas mencionadas pertenecen a sus respectivos titulares. Su referencia dentro de CociFlash tiene finalidad descriptiva y no implica patrocinio, asociación o respaldo salvo indicación expresa.</p>
    <h2>4. Reclamos</h2><p>Si sos titular de derechos y considerás que una referencia incluida en CociFlash infringe tus derechos, podés solicitar su revisión y eventual retiro escribiendo a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. La solicitud debería identificar claramente la obra, la referencia cuestionada, tus datos de contacto y la razón del reclamo, junto con la información que permita verificar tu legitimación.</p>
    <h2>5. No descargar ni redistribuir</h2><p>El hecho de que CociFlash muestre una referencia no concede al usuario una licencia para descargar, copiar, republicar, monetizar o redistribuir el contenido de terceros. El uso del contenido queda sujeto a los derechos del titular, las condiciones de la plataforma de origen y la legislación aplicable.</p>
  </>
);

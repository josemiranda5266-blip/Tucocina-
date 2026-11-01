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

const effectiveDate = '1 de noviembre de 2026';
const contactEmail = 'contacto@cociflash.com';

export const LegalPage: React.FC<LegalPageProps> = ({ section, onNavigate }) => (
  <div className="max-w-5xl mx-auto">
    <button type="button" onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 text-sm text-amber-800 hover:text-amber-950 font-semibold mb-6"><ArrowLeft className="w-4 h-4" /> Volver a SaborClick</button>
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-6 sm:px-10 pt-8 pb-5 border-b border-stone-200">
        <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">SaborClick · Información legal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-stone-900">{sections.find((item) => item.id === section)?.label}</h1>
        <p className="mt-2 text-sm text-stone-500">Vigente desde {effectiveDate}. Versión legal 2026-11-01.</p>
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
    <p>SaborClick es una plataforma web orientada a descubrir, buscar y organizar videos públicos de cocina, recetas y pastelería publicados en plataformas de terceros. Esta política explica qué información puede tratar SaborClick cuando una persona utiliza el sitio, crea una cuenta o interactúa con sus funciones.</p>
    <p>La información se trata de acuerdo con la normativa aplicable en materia de protección de datos personales, incluyendo la Ley 25.326 y sus normas complementarias.</p>

    <h2>2. Datos que podemos tratar</h2>
    <ul>
      <li><strong>Cuenta:</strong> identificador de usuario, nombre visible, dirección de correo electrónico y foto de perfil proporcionados por Google/Firebase Authentication cuando elegís iniciar sesión con Google.</li>
      <li><strong>Actividad dentro de SaborClick:</strong> favoritos, reportes, comentarios y otras acciones necesarias para prestar las funciones solicitadas.</li>
      <li><strong>Preferencias y cumplimiento:</strong> registro de la versión legal aceptada y la fecha/hora de aceptación.</li>
      <li><strong>Analítica:</strong> identificadores anónimos o seudónimos de visitante y sesión, páginas visitadas, búsquedas, reproducciones, favoritos, compartidos y otros eventos agregados.</li>
      <li><strong>Datos técnicos:</strong> información técnica necesaria para seguridad, funcionamiento y medición, como tipo de dispositivo y determinados encabezados proporcionados por la infraestructura.</li>
    </ul>
    <p>SaborClick no solicita deliberadamente datos sensibles para prestar su servicio y no debe utilizarse para introducir datos sensibles en campos de texto.</p>

    <h2>3. Para qué utilizamos la información</h2>
    <ul><li>Autenticar usuarios y mantener sus cuentas.</li><li>Guardar favoritos, comentarios y gestionar reportes.</li><li>Proteger la plataforma frente a abusos y mantener su seguridad.</li><li>Registrar la aceptación de las condiciones legales aplicables.</li><li>Comprender el uso general del sitio mediante estadísticas agregadas.</li><li>Mejorar las funciones, navegación y catálogo.</li><li>Cumplir obligaciones legales cuando corresponda.</li></ul>

    <h2>4. Proveedores y terceros</h2>
    <p>SaborClick utiliza servicios tecnológicos de terceros para operar la plataforma, entre ellos Google/Firebase para autenticación y almacenamiento, Render para alojamiento del servidor y Cloudflare para infraestructura de dominio/DNS y correo de recepción. Los videos permanecen en las plataformas de origen y pueden utilizar sus propios mecanismos de seguimiento y políticas de privacidad.</p>
    <p>Cuando seguís un enlace o utilizás un reproductor de una plataforma externa, esa plataforma puede tratar información directamente bajo sus propias condiciones.</p>
    <h2>5. Publicidad de terceros</h2>
    <p>SaborClick puede mostrar anuncios servidos por Adsterra y, según la configuración vigente, por otros proveedores publicitarios. Para entregar, limitar la frecuencia, medir y prevenir tráfico publicitario inválido, el proveedor y sus socios pueden recibir o generar información técnica relacionada con la visita, como dirección IP, identificadores en línea, datos del navegador y dispositivo, páginas o espacios publicitarios vistos y las interacciones con los anuncios. Según las tecnologías y campañas disponibles, esa información puede incluir cookies, almacenamiento local, etiquetas, píxeles u otros identificadores.</p>
    <p>Los proveedores publicitarios pueden utilizar esos datos para seleccionar anuncios contextuales o personalizados, medir su rendimiento, detectar fraude y cumplir obligaciones legales. El tratamiento que realicen dichos terceros se rige también por sus propias políticas y no está íntegramente bajo el control de SaborClick. La presencia de publicidad no significa que SaborClick conozca la identidad de la persona que ve o interactúa con cada anuncio.</p>
    <p>Información del proveedor: <a href="https://adsterra.com/privacy-policy-managed" target="_blank" rel="noopener noreferrer">Política de privacidad de Adsterra</a> y <a href="https://adsterra.com/cookies/" target="_blank" rel="noopener noreferrer">Política de cookies de Adsterra</a>. Estas políticas pueden cambiar y recomendamos consultarlas directamente.</p>
    <p>SaborClick no vende por cuenta propia los datos personales de sus usuarios. La transmisión técnica de información a proveedores para prestar servicios publicitarios no debe interpretarse como una venta de datos.</p>

    <h2>6. Conservación, eliminación y seguridad</h2>
    <p>Conservamos la información durante el tiempo necesario para prestar el servicio, mantener registros operativos, atender reportes y cumplir obligaciones legales. La cuenta dispone de una opción para solicitar la eliminación de la cuenta y de los datos de primera parte asociados, incluyendo perfil, favoritos, reportes y comentarios asociados. Los eventos de analítica agregados no están vinculados directamente con la identidad de la cuenta y pueden conservarse como estadísticas anónimas.</p>
    <p>Aplicamos controles de autenticación, autorización y medidas técnicas razonables para proteger la información. Ningún sistema conectado a Internet puede garantizar seguridad absoluta.</p>

    <h2>7. Preferencias y revocación del consentimiento publicitario</h2>
    <p>Antes de cargar los espacios publicitarios de Adsterra, SaborClick muestra un panel que permite aceptar o rechazar la carga de sus scripts y las tecnologías asociadas. Si no existe una elección válida para la versión vigente o si la persona rechaza, los espacios publicitarios de Adsterra permanecen bloqueados. La aceptación publicitaria es independiente de la aceptación de estos Términos de Uso y de la Política de Privacidad.</p>
    <p>La elección se guarda en el almacenamiento local del navegador, junto con la versión del aviso y la fecha/hora, y no se vincula a la cuenta de usuario. Puede modificarse en cualquier momento desde el enlace «Preferencias de publicidad» del pie de página. Al rechazar o retirar la aceptación, SaborClick deja de cargar los espacios de Adsterra en las siguientes renderizaciones. Esto no elimina datos que el proveedor o sus socios ya hayan tratado ni garantiza borrar cookies propias de esos terceros; para ello también pueden ser necesarios los controles del navegador y los mecanismos que ofrezca cada proveedor.</p>
    <p>La aceptación permite que Adsterra y sus socios utilicen las tecnologías descritas en esta política para entregar anuncios, limitar frecuencia, medir resultados y prevenir fraude; según la campaña y la configuración del proveedor, también podrían intervenir tecnologías de personalización. SaborClick no afirma que cada campaña utilice todas esas tecnologías.</p>
    <h2>8. Derechos de las personas</h2>
    <p>De acuerdo con la normativa argentina aplicable, podés solicitar acceso, rectificación, actualización o supresión de tus datos personales, además de ejercer los demás derechos que correspondan. El canal oficial de SaborClick es <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Las solicitudes pueden requerir verificación de identidad para evitar accesos indebidos.</p>

    <h2>9. Contacto</h2>
    <p>Para solicitudes de privacidad, eliminación de datos, reclamos sobre contenido o consultas generales: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>

    <h2>10. Cambios</h2>
    <p>Podemos actualizar esta política cuando cambien las funciones, proveedores o requisitos legales. La fecha y versión de vigencia permiten identificar la versión aplicable. Si una actualización requiere un consentimiento específico, se solicitará nuevamente.</p>
  </>
);

const TermsContent = () => (
  <>
    <h2>1. Objeto</h2><p>SaborClick ofrece herramientas para descubrir, buscar, organizar y reproducir o abrir referencias a videos de cocina, oficios y habilidades prácticas disponibles en servicios de terceros. El servicio puede modificarse, ampliarse o discontinuarse parcialmente cuando resulte necesario.</p>
    <h2>2. Cuenta de usuario</h2><p>Algunas funciones requieren autenticación mediante Google. La persona usuaria es responsable de utilizar su cuenta legítimamente y de no intentar acceder a cuentas, datos o funciones que no le correspondan.</p>
    <h2>3. Aceptación</h2><p>Para utilizar una cuenta se solicita una aceptación expresa de estos Términos de Uso y de la Política de Privacidad. SaborClick registra la versión legal y la fecha/hora de esa aceptación para mantener constancia de la versión aceptada.</p>
    <h2>4. Uso aceptable</h2><p>No está permitido utilizar SaborClick para actividades ilícitas, fraude, abuso, extracción automatizada que perjudique el servicio, evasión de medidas de seguridad, distribución de malware o envío deliberado de información falsa o abusiva.</p>
    <h2>5. Disponibilidad</h2><p>SaborClick se proporciona en función de la disponibilidad de su infraestructura y de las plataformas externas. No garantizamos disponibilidad permanente ni que todos los videos externos permanezcan publicados, sean reproducibles o estén disponibles en todos los países.</p>
    <h2>6. Publicidad</h2><p>El sitio puede mostrar publicidad de terceros, incluida publicidad servida por Adsterra, únicamente después de que la persona haya realizado una elección afirmativa en el panel de preferencias publicitarias. Rechazar o retirar esa elección bloquea la carga de los espacios de Adsterra. La preferencia publicitaria es independiente de la aceptación de los términos legales. Los proveedores y anunciantes correspondientes son responsables de sus propios contenidos, destinos y tratamientos de datos. SaborClick no garantiza ni necesariamente respalda los productos, servicios o afirmaciones anunciados.</p>
    <h2>7. Contenido de terceros</h2><p>Los videos, imágenes, nombres, marcas y demás contenidos de terceros pertenecen a sus respectivos titulares. SaborClick no afirma ser propietario de esos contenidos ni representa a sus autores o plataformas de origen.</p>
    <h2>8. Reportes y moderación</h2><p>SaborClick puede revisar y retirar de su catálogo referencias que infrinjan estos términos, derechos de terceros, normas de las plataformas de origen o la legislación aplicable. Un reporte no implica que el contenido sea ilícito ni garantiza su retiro inmediato.</p>
    <h2>9. Propiedad de SaborClick</h2><p>El software, diseño, textos originales, estructura del catálogo y elementos propios de SaborClick pertenecen a sus respectivos titulares y no pueden copiarse o explotarse fuera de los usos permitidos por la legislación aplicable.</p>
    <h2>10. Eliminación de cuenta</h2><p>La persona usuaria puede solicitar la eliminación de su cuenta desde la propia aplicación. La eliminación afecta los datos de primera parte asociados que SaborClick pueda eliminar técnicamente, sin perjuicio de registros que deban conservarse por obligación legal o de estadísticas agregadas que no permitan identificar directamente a la persona.</p>
    <h2>11. Modificaciones</h2><p>Podemos actualizar estos términos cuando cambien las funciones, proveedores o requisitos legales. Cuando una modificación requiera un consentimiento específico, se solicitará de forma correspondiente.</p>
    <h2>12. Legislación</h2><p>Estos términos se interpretarán conforme a la legislación argentina aplicable, sin perjuicio de los derechos irrenunciables que correspondan a las personas usuarias conforme a la normativa vigente.</p>
  </>
);

const CookiesContent = () => (
  <>
    <h2>1. Qué tecnologías utiliza SaborClick</h2><p>SaborClick utiliza tecnologías de almacenamiento local y mecanismos de sesión para mantener funciones del sitio y medir su utilización. Actualmente la analítica propia utiliza un identificador aleatorio de visitante guardado localmente y un identificador de sesión que se renueva después de un período de inactividad.</p>
    <h2>2. Qué medimos</h2><p>Podemos registrar eventos agregados como visitas de página, apertura y reproducción de videos, búsquedas, favoritos, compartidos, inicios de sesión y registros. También pueden registrarse de forma agregada el tipo de dispositivo y, cuando la infraestructura lo proporciona, el país de conexión.</p>
    <h2>3. Para qué</h2><p>La finalidad es conocer el funcionamiento y utilización general de SaborClick, detectar problemas, mejorar la experiencia y evaluar qué contenidos y funciones son útiles. La analítica propia está diseñada para evitar almacenar deliberadamente direcciones IP completas o correos electrónicos como parte de los eventos.</p>
    <h2>4. Servicios externos</h2><p>Los reproductores, enlaces y servicios de terceros pueden utilizar sus propias cookies, almacenamiento o tecnologías de seguimiento. Esos tratamientos dependen de la plataforma correspondiente y no están controlados por SaborClick.</p>
    <h2>5. Publicidad y tecnologías de terceros</h2>
    <p>Los espacios publicitarios de SaborClick pueden cargar recursos de Adsterra. Al solicitarse un anuncio, el navegador se comunica con servidores externos y el proveedor o sus socios pueden utilizar cookies, identificadores, almacenamiento local, etiquetas o píxeles para entregar anuncios, limitar repeticiones, medir resultados, detectar fraude o, cuando corresponda, personalizar publicidad. También pueden tratar datos técnicos como IP, navegador, dispositivo, idioma, ubicación aproximada, página o espacio publicitario e interacción con el anuncio.</p>
    <p>No existe una lista universal y fija de cookies que podamos garantizar para todas las campañas: los nombres, dominios, duración y finalidad pueden variar según el anuncio, los socios y el país. Para información actualizada sobre tecnologías del propio proveedor, consultá su <a href="https://adsterra.com/cookies/" target="_blank" rel="noopener noreferrer">Política de cookies</a> y su <a href="https://adsterra.com/privacy-policy-managed" target="_blank" rel="noopener noreferrer">Política de privacidad</a>.</p>
    <p>Los proveedores externos son responsables de explicar sus propios tratamientos y opciones. SaborClick no controla íntegramente las cookies o identificadores que puedan establecer esos terceros.</p>
    <h2>6. Preferencias y control del usuario</h2><p>Antes de cargar Adsterra, SaborClick presenta un panel para aceptar o rechazar la publicidad. La elección queda guardada localmente en el navegador con la versión del aviso y su fecha/hora. Podés cambiarla o retirarla en cualquier momento mediante «Preferencias de publicidad» en el pie de página. Si rechazás o retirás la aceptación, los espacios de Adsterra dejan de cargarse. Esta acción no borra cookies o datos que terceros ya hayan almacenado; podés utilizar también los controles del navegador y las opciones que ofrezca cada proveedor.</p>
  </>
);

const ContentContent = () => (
  <>
    <h2>1. Naturaleza del contenido</h2><p>SaborClick organiza referencias a videos de aprendizaje práctico publicados por terceros. La disponibilidad pública de una obra en Internet no significa por sí sola que su autor haya renunciado a sus derechos. La Ley 11.723 protege las obras y sus titulares.</p>
    <h2>2. Videos y plataformas de origen</h2><p>SaborClick procura utilizar mecanismos de reproducción, enlaces o integraciones compatibles con las plataformas de origen. No descarga ni pretende apropiarse de los videos de terceros como si fueran contenido propio.</p>
    <h2>3. Marcas y nombres</h2><p>YouTube, Instagram, TikTok, sus logotipos y las demás marcas mencionadas pertenecen a sus respectivos titulares. Su referencia dentro de SaborClick tiene finalidad descriptiva y no implica patrocinio, asociación o respaldo salvo indicación expresa.</p>
    <h2>4. Reclamos</h2><p>Si sos titular de derechos y considerás que una referencia incluida en SaborClick infringe tus derechos, podés solicitar su revisión y eventual retiro escribiendo a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. La solicitud debería identificar claramente la obra, la referencia cuestionada, tus datos de contacto y la razón del reclamo, junto con la información que permita verificar tu legitimación.</p>
    <h2>5. No descargar ni redistribuir</h2><p>El hecho de que SaborClick muestre una referencia no concede al usuario una licencia para descargar, copiar, republicar, monetizar o redistribuir el contenido de terceros. El uso del contenido queda sujeto a los derechos del titular, las condiciones de la plataforma de origen y la legislación aplicable.</p>
  </>
);

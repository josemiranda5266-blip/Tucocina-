export type ContentVerticalId = 'COCINA' | 'OFICIOS';

export interface ContentCategoryRule { id: string; name: string; terms: string[]; }
export interface ContentVerticalDefinition {
  id: ContentVerticalId;
  name: string;
  description: string;
  positiveTerms: string[];
  exclusionTerms: string[];
  categoryRules: ContentCategoryRule[];
  tagTerms: string[];
  discoveryQueries: string[];
}

export const CONTENT_VERTICALS: Record<ContentVerticalId, ContentVerticalDefinition> = {
  COCINA: {
    id: 'COCINA', name: 'Cocina', description: 'Recetas, cocina, pastelería, panadería y gastronomía.',
    positiveTerms: ['receta','recetas','cocina','cocinar','cocinando','ingredientes','preparar','preparación','elaboración','paso a paso','cómo hacer','como hacer','pollo','carne','pasta','pizza','empanada','torta','postre','pan','panadería','pastelería','asado','guiso','sopa','salsa','ensalada','almuerzo','cena','desayuno','comida','gastronomía','chef','gourmet','casero','casera','horno','sartén','air fryer','freidora'],
    exclusionTerms: ['música','musica','official music video','videoclip','song','album','remix','cover','trailer','película','pelicula','movie','gameplay','gaming','noticias','noticia','news','política','politica','fútbol','futbol','unboxing','reaction','reacción','parodia'],
    categoryRules: [
      {id:'cat-carnes',name:'Carnes',terms:['carne','asado','bife','costilla','milanesa','hamburguesa','cerdo','cordero']},
      {id:'cat-pollo',name:'Pollo',terms:['pollo','pechuga','alitas','alita']},
      {id:'cat-pastas',name:'Pastas',terms:['pasta','fideos','spaghetti','espagueti','ravioles','ñoquis','gnocchi','lasagna','lasaña']},
      {id:'cat-panaderia',name:'Panadería',terms:['pan','panadería','panaderia','factura','medialuna','croissant']},
      {id:'cat-postres',name:'Postres',terms:['torta','pastel','budín','budin','flan','helado','galleta','cookie','brownie','postre','cheesecake']},
      {id:'cat-ensaladas',name:'Ensaladas',terms:['ensalada','ensaladas']},
      {id:'cat-salsas',name:'Salsas',terms:['salsa','salsas','mayonesa','chimichurri','pesto']},
      {id:'cat-desayunos',name:'Desayunos',terms:['desayuno','desayunos','tostadas','omelette']},
      {id:'cat-comida-rapida',name:'Comida rápida',terms:['pizza','pizzeta','hot dog','papas fritas','comida rápida','comida rapida']},
      {id:'cat-saludable',name:'Saludable',terms:['vegetariano','vegetariana','vegano','vegana','verduras','vegetales','saludable']},
      {id:'cat-argentina',name:'Cocina argentina',terms:['empanada','empanadas','mate','locro','choripan','chimichurri','criolla','argentino','argentina']},
      {id:'cat-internacional',name:'Cocina internacional',terms:['sushi','ramen','tacos','curry','paella','wok']},
    ],
    tagTerms: ['fácil','facil','rápido','rapido','casero','casera','económico','economico','sin horno','air fryer','freidora de aire','sin gluten','saludable','vegetariano','vegetariana','vegano','vegana','desayuno','almuerzo','cena'],
    discoveryQueries: ['recetas fáciles','recetas argentinas','cocina argentina','cómo hacer empanadas','cómo hacer pizza','recetas de pollo','recetas de carne','recetas de pasta','recetas fáciles y rápidas','postres fáciles','tortas fáciles','pan casero','cocina casera','recetas tradicionales','comida casera','asado criollo paso a paso','locro criollo tradicional','comida saludable fácil'],
  },
  OFICIOS: {
    id: 'OFICIOS', name: 'Oficios', description: 'Videos prácticos sobre reparación, instalación, fabricación y mantenimiento de oficios.',
    positiveTerms: ['oficio','oficios','cómo hacer','como hacer','paso a paso','tutorial','instalar','instalación','instalacion','reparar','reparación','reparacion','arreglar','mantenimiento','fabricar','fabricación','fabricacion','herramientas','medir','cortar','soldar','soldadura','montar','desmontar','electricista','plomero','carpintero','albañil','pintor','soldador','mecánico','mecanico','refrigeración','refrigeracion'],
    exclusionTerms: ['música','musica','official music video','videoclip','song','album','remix','cover','trailer','película','pelicula','movie','gameplay','gaming','noticias','noticia','news','política','politica','fútbol','futbol','unboxing','reaction','reacción','parodia'],
    categoryRules: [
      {id:'of-electricidad',name:'Electricidad',terms:['electricidad','electricista','eléctrico','electrico','cableado','tomacorriente','enchufe','interruptor','tablero','disyuntor','térmica','termica']},
      {id:'of-plomeria',name:'Plomería',terms:['plomería','plomeria','plomero','cañería','caneria','caño','cano','grifo','canilla','desagüe','desague','agua']},
      {id:'of-carpinteria',name:'Carpintería',terms:['carpintería','carpinteria','carpintero','madera','mueble','mesa','silla','melamina','mdf']},
      {id:'of-albanileria',name:'Albañilería',terms:['albañilería','albanileria','albañil','ladrillo','cemento','hormigón','hormigon','revoque','pared','piso','contrapiso']},
      {id:'of-pintura',name:'Pintura',terms:['pintura','pintor','pintar','rodillo','pincel','barniz','látex','latex']},
      {id:'of-soldadura',name:'Soldadura',terms:['soldadura','soldar','soldador','electrodo','mig','tig','herrero','herreria']},
      {id:'of-mecanica',name:'Mecánica',terms:['mecánica','mecanica','mecánico','mecanico','motor','auto','automóvil','automovil','freno','embrague','aceite']},
      {id:'of-refrigeracion',name:'Refrigeración',terms:['refrigeración','refrigeracion','refrigerador','heladera','aire acondicionado','gas refrigerante','compresor']},
    ],
    tagTerms: ['fácil','facil','rápido','rapido','paso a paso','tutorial','herramientas','principiantes','principiante','casero','casera','económico','economico','sin experiencia','mantenimiento','reparación','reparacion'],
    discoveryQueries: ['electricidad domiciliaria paso a paso','cómo instalar un tomacorriente','plomería reparación paso a paso','carpintería para principiantes','cómo reparar una canilla','albañilería paso a paso','pintura de paredes tutorial','soldadura para principiantes','mecánica automotriz básica','refrigeración reparación'],
  },
};

export function getContentVertical(id: ContentVerticalId = 'COCINA'): ContentVerticalDefinition {
  return CONTENT_VERTICALS[id];
}


export function isCategoryInVertical(categoryId: string | null | undefined, verticalId: ContentVerticalId): boolean {
  if (!categoryId) return true;
  return getContentVertical(verticalId).categoryRules.some((rule) => rule.id === categoryId);
}


const UNIQUE_TAGS_BY_VERTICAL: Record<ContentVerticalId, string[]> = {
  COCINA: ['sin horno','air fryer','freidora de aire','sin gluten','saludable','vegetariano','vegetariana','vegano','vegana','desayuno','almuerzo','cena'],
  OFICIOS: ['tutorial','herramientas','principiantes','principiante','sin experiencia','mantenimiento','reparación','reparacion'],
};

export function getInvalidTagsForVertical(tags: string[] | null | undefined, verticalId: ContentVerticalId): string[] {
  if (!Array.isArray(tags)) return [];
  const forbidden = new Set(UNIQUE_TAGS_BY_VERTICAL[verticalId === 'COCINA' ? 'OFICIOS' : 'COCINA'].map((tag) =>
    tag.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''),
  ));
  return tags.filter((tag) => forbidden.has(String(tag).trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')));
}

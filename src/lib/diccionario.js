// Diccionario base de palabras clave → categoría
// Las palabras personalizadas del usuario se guardan en Supabase (tabla diccionario_personal)
// y se fusionan en el parser en tiempo de ejecución.

export const DICCIONARIO_BASE = {
  // Transporte
  uber:       'transporte',
  taxi:       'transporte',
  cabify:     'transporte',
  subte:      'transporte',
  colectivo:  'transporte',
  bondi:      'transporte',
  tren:       'transporte',
  nafta:      'transporte',
  combustible:'transporte',
  peaje:      'transporte',
  estacionamiento: 'transporte',

  // Comida
  super:       'comida',
  supermercado:'comida',
  almuerzo:    'comida',
  cena:        'comida',
  desayuno:    'comida',
  delivery:    'comida',
  pedidos:     'comida',
  rappi:       'comida',
  café:        'comida',
  cafe:        'comida',
  restaurant:  'comida',
  restaurante: 'comida',
  panaderia:   'comida',
  panadería:   'comida',
  kiosco:      'comida',
  mercado:     'comida',
  carniceria:  'comida',
  carnicería:  'comida',
  verduleria:  'comida',
  verdulería:  'comida',

  // Vivienda
  alquiler:    'vivienda',
  expensas:    'vivienda',
  abl:         'vivienda',
  inmobiliaria:'vivienda',
  hipoteca:    'vivienda',

  // Servicios
  luz:         'servicios',
  gas:         'servicios',
  agua:        'servicios',
  internet:    'servicios',
  celular:     'servicios',
  telefono:    'servicios',
  teléfono:    'servicios',
  cable:       'servicios',
  telefonía:   'servicios',

  // Entretenimiento
  netflix:     'entretenimiento',
  spotify:     'entretenimiento',
  disney:      'entretenimiento',
  hbo:         'entretenimiento',
  cine:        'entretenimiento',
  teatro:      'entretenimiento',
  salida:      'entretenimiento',
  bar:         'entretenimiento',
  boliche:     'entretenimiento',
  recital:     'entretenimiento',
  juego:       'entretenimiento',
  steam:       'entretenimiento',

  // Salud
  farmacia:    'salud',
  medico:      'salud',
  médico:      'salud',
  doctor:      'salud',
  dentista:    'salud',
  psicólogo:   'salud',
  psicologo:   'salud',
  remedio:     'salud',
  medicamento: 'salud',
  clinica:     'salud',
  clínica:     'salud',
  hospital:    'salud',
  obra_social: 'salud',

  // Ingreso
  sueldo:      'ingreso',
  salario:     'ingreso',
  honorarios:  'ingreso',
  freelance:   'ingreso',
  venta:       'ingreso',
  cobré:       'ingreso',
  cobranza:    'ingreso',

  // Ahorro / Inversión
  ahorro:      'ahorro',
  ahorré:      'ahorro',
  inversion:   'ahorro',
  inversión:   'ahorro',
  plazo_fijo:  'ahorro',
  fci:         'ahorro',
  dolar:       'ahorro',
  dólar:       'ahorro',
  cripto:      'ahorro',
  bitcoin:     'ahorro',
}

// Palabras que indican tipo de movimiento
export const PALABRAS_TIPO = {
  gasto: [
    'gasté', 'gaste', 'compré', 'compre', 'pagué', 'pague',
    'salió', 'salio', 'costó', 'costo', 'desembolsé', 'puse'
  ],
  ingreso: [
    'cobré', 'cobre', 'me pagaron', 'recibí', 'recibi',
    'ingresó', 'ingreso', 'gané', 'gane', 'entró', 'entro'
  ],
  ahorro: [
    'ahorré', 'ahorre', 'guardé', 'guarde', 'invertí', 'inverti',
    'puse en', 'deposité', 'deposite'
  ]
}

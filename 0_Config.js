//0_Config.gs
// ================== CONSTANTES GLOBALES ==================
const HOJA = {
    HISTORIAL: "Historial",
    MAPS: "Maps",
    PARADAS_SEGURAS: "Paradas_Seguras",
    SOLICITUDES: "Solicitudes",
    SWITCHES: "Switches",
    CAMARAS: 'Camaras',
    CAMARA: 'Camaras',
    TABLEROS: 'Tableros',
    TABLERO: 'Tableros',
    TAREAS: 'Tareas',
    TAREA: 'Tareas',
    ALARMAS: "Alarmas",
    ALARMA: "Alarmas"
};

const CAMPOS = {
    ID: 'ID',                     // Col A
    NOMBRE: 'Nombre',             // Col B (Dirección/Ubicación)
    MARCADO: 'Marcado',           // Col C
    ESTADO: 'Estado',             // Col D
    ENERGIA: 'Energia',           // Col E
    CONECTIVIDAD: 'Conectividad', // Col F
    PROVEEDOR: 'Proveedor',       // Col G
    TIPO: 'Tipo',                 // Col H
    OBSERVACIONES: 'Observaciones', // Col I
    SWITCH: 'Switch',             // Col J
    WORKFLOW: 'Estado_Workflow',  // Col K
    PERFIL: 'Asignado_A_Perfil',  // Col L
    LATITUD: 'Latitud',           // hoja Maps - Col C
    LONGITUD: 'Longitud'          // hoja Maps - Col D
};

const ESTADO = {
    PEDIDO: "PEDIDO",
    INSTALADO: "INSTALADO",
    CONECTADA: "CONECTADA",
    PENDIENTE: "PENDIENTE",
    ACCESO: "ACCESO",
    CREACION: "CREACION"
};


const PERFILES = {
    OPERADOR: 'OPERADOR',
    SOPORTE: 'SOPORTE',
    TECNICO: 'TECNICO',
    COORDINADOR: 'COORDINADOR',
    COM: 'COM'
};

const DEFINICION_ROLES = {
  "ADMIN": { 
    esFull: true, 
    permisos: ["NUEVO", "AUTORIZAR", "INSTALACION", "ENERGIA", "CONECTIVIDAD", "SWITCH", "INFORMES", "TAREAS"]
  },
  "TECNICO": { 
    esFull: false, 
    permisos: ["INSTALACION", "CONECTIVIDAD","ENERGIA", "MAPA", "SWITCH", "INFORMES", "TAREAS"] 
  },
  "LECTURA": { 
    esFull: false, 
    permisos: ["INFORMES", "MAPA"] 
  },
  "SECRETARIO": { 
    esFull: false, 
    permisos: ["AUTORIZAR", "INFORMES", "MAPA", "TAREAS"] 
  },
  "COM": { 
    esFull: false, 
    permisos: ["SOLICITAR", "TAREAS", "INFORMES", "MAPA"] // SOLICITAR es el permiso para nuevas cámaras
  }
};

const PREFIJO_ID = "NSDS-";
const HOJA_TABLEROS = "Tableros";

const MAILS_ESTADO = {
    "INSTALADO": ["pollolopeza@gmail.com"],
    "PEDIDO": ["pollolopeza@gmail.com"],
    "CONECTADA": ["pollolopeza@gmail.com"]
};


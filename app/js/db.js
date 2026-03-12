/**
 * db.js - Gestión de almacenamiento local offline utilizando LocalStorage
 */

const DB = {
    KEYS: {
        REGISTROS: 'prosegur_registros_offline',
        EVENTOS: 'prosegur_eventos_offline',
        CONFIG: 'prosegur_app_config'
    },

    // Método de inicialización (evita que index.html lance error)
    init: function () {
        // Reservado por si requerimos setup complejo offline en el futuro
    },

    // Generar ID único
    generateUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Obtener fecha actual ISO
    getTimestamp: function () {
        return new Date().toISOString();
    },

    // Leer tabla genérica
    _read: function (key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    // Escribir tabla genérica
    _write: function (key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    // Guardar un registro de entrada/salida
    saveRegistroMovimiento: function (data) {
        const registros = this._read(this.KEYS.REGISTROS);
        const record = {
            id: this.generateUUID(),
            timestamp: this.getTimestamp(),
            synced: false,
            payload: data
        };
        registros.push(record);
        this._write(this.KEYS.REGISTROS, registros);
        return record.id;
    },

    // Guardar un reporte de evento
    saveEvento: function (data) {
        const eventos = this._read(this.KEYS.EVENTOS);
        const record = {
            id: this.generateUUID(),
            timestamp: this.getTimestamp(),
            synced: false,
            payload: data
        };
        eventos.push(record);
        this._write(this.KEYS.EVENTOS, eventos);
        return record.id;
    },

    // Obtener todos los pendientes
    getPendingSync: function () {
        const reg = this._read(this.KEYS.REGISTROS).filter(r => !r.synced);
        const evt = this._read(this.KEYS.EVENTOS).filter(e => !e.synced);
        return {
            movimientos: reg,
            eventos: evt,
            total: reg.length + evt.length
        };
    },

    // Marcar como sincronizados (Mock function para cuando haya backend)
    markAsSynced: function () {

        let reg = this._read(this.KEYS.REGISTROS);
        reg = reg.map(r => { r.synced = true; return r; });
        this._write(this.KEYS.REGISTROS, reg);

        let evt = this._read(this.KEYS.EVENTOS);
        evt = evt.map(e => { e.synced = true; return e; });
        this._write(this.KEYS.EVENTOS, evt);
    },

    // Borrar sincronizados para liberar espacio
    cleanupSynced: function () {
        const reg = this._read(this.KEYS.REGISTROS).filter(r => !r.synced);
        this._write(this.KEYS.REGISTROS, reg);

        const evt = this._read(this.KEYS.EVENTOS).filter(e => !e.synced);
        this._write(this.KEYS.EVENTOS, evt);
    }
};

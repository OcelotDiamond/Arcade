class Keys {
    /**
     * @type {Object.<string, boolean>}
     */
    static #key = {};

    /**
     * @type {Object.<string, boolean>}
     */
    static buffer = {};

    static init() {
        key = {};

        window.addEventListener('keyup', this.#keyUp.bind(this));
        window.addEventListener('keydown', this.#keyDown.bind(this));
        window.addEventListener('blur', this.#unfocus.bind(this));
    }

    /**
     * @param {KeyboardEvent} event 
     */
    static #keyDown(event) {
        this[event.key.toLowerCase()] = true;
        this.#key[event.key.toLowerCase()] = true;
        this.buffer[event.key.toLowerCase()] = true;
    }

    /**
     * @param {KeyboardEvent} event 
     */
    static #keyUp(event) {
        if (!this[event.key.toLowerCase()]) {return}
        delete this[event.key.toLowerCase()];
        delete this.#key[event.key.toLowerCase()];
    }

    /**
     * @param {FocusEvent} event
     */
    static #unfocus(event) {
        const keys = Object.keys(this.#key);

        for (let i = 0; i < keys.length; i++) {
            if (this[keys[i]]) {
                delete this[keys[i]];
                delete this.#key[keys[i]];
            }
        }

        this.buffer = {};
    }

    /**
     * @returns {Object.<string, boolean>}
     */
    static update() {
        const temp = this.buffer;
        this.buffer = {};
        return temp;
    }
}
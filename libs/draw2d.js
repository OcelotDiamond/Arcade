class Draw2D {
    /**
     * @type {HTMLCanvasElement}
     */
    static canvas;
    /**
     * @type {CanvasRenderingContext2D}
     */
    static ctx;

    static autoResize = true;
    static steppedResize = true;
    static xResolution = 128;
    static yResolution = 128;

    static displayMultiplier = 1;

    /**
     * @type {HTMLElement}
     */
    static container;

    /**
     * @param {boolean} [options.autoResize] - Whether the canvas will automatically be resized
     * @param {boolean} [options.steppedResize] - Whether the canvas will resize only in multiples of the resolution
     * @param {number} [options.resolution] - Artificial resolution used for drawing functions
     * @param {number} [options.xResolution] - Artificial x resolution used for drawing functions
     * @param {number} [options.yResolution] - Artificial y resolution used for drawing functions
     * @param {HTMLCanvasElement} [options.canvas] - Override default canvas setting
     */
    static init(options = {}) {
        this.canvas = options.canvas ?? document.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.autoResize = options.autoResize ?? true;
        this.steppedResize = options.steppedResize ?? true;
        this.xResolution = (options.xResolution ?? options.resolution) ?? 128;
        this.yResolution = (options.yResolution ?? options.resolution) ?? 128;

        this.container = options.container ?? document.body;

        if (this.autoResize) {
            this.container.onresize = this.onResize.bind(this);
        }
        
        this.onResize();
    }

    static onResize() {
        const bcRect = this.container.getBoundingClientRect();
        
        const simpleMultiplier = Math.min(
            bcRect.width / this.xResolution,
            bcRect.height / this.yResolution
        );

        this.displayMultiplier = this.steppedResize ? Math.floor(simpleMultiplier): simpleMultiplier;

        this.canvas.width = Math.round(this.displayMultiplier * this.xResolution);
        this.canvas.height = Math.round(this.displayMultiplier * this.yResolution);
    }

    /**
     * @type {string[]}
     */
    static palette = [];

    /**
     * @param {number|string|CanvasGradient|CanvasPattern} color - A palette index or a color / pattern
     */
    static set color(color) {
        if (typeof(color) === 'number') {
            this.ctx.fillStyle = palette[color] ?? '#ff0000';
        } else {
            this.ctx.fillStyle = color;
        }
    }

    /**
     * @param {number} distance - The blur distance of the shadow
     */
    static set shadowDistance(distance) {
        this.ctx.shadowBlur = distance * this.displayMultiplier;
    }

    /**
     * @param {number|string} color - A palette index or a color in hex
     */
    static set shadowColor(color) {
        if (typeof(color) === 'number') {
            this.ctx.shadowColor = palette[color] ?? '#ff0000';
        } else {
            this.ctx.shadowColor = color;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    static rect(x, y, w, h) {
        this.ctx.fillRect(
            x * this.displayMultiplier,
            y * this.displayMultiplier,
            w * this.displayMultiplier,
            h * this.displayMultiplier
        );
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number[][]} points - The points composing the polygon as x y pairs
     */
    static poly(x, y, points) {
        this.ctx.beginPath();
        this.ctx.moveTo(
            (points[0][0] + x) * this.displayMultiplier,
            (points[0][1] + y) * this.displayMultiplier
        );
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(
                (points[i][0] + x) * this.displayMultiplier,
                (points[i][1] + y) * this.displayMultiplier
            );
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} radius 
     */
    static circle(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(
            x * this.displayMultiplier,
            y * this.displayMultiplier,
            radius * this.displayMultiplier,
            0, Math.PI * 2
        );
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} radius 
     * @param {number} start - The start position of the arc in radians 
     * @param {number} end - The end position of the arc in radians 
     */
    static arc(x, y, radius, start, end) {
        this.ctx.beginPath();
        this.ctx.arc(
            x * this.displayMultiplier,
            y * this.displayMultiplier,
            radius * this.displayMultiplier,
            start, end
        );
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * @param {string} url 
     * @param {(image: HTMLImageElement) => undefined} callback 
     */
    static syncGetImage(url, callback) {
        const image = new Image();

        image.onload = () => {
            callback(image);
        }

        image.src = url;
    }

    /**
     * @param {string} url 
     * @returns {HTMLImageElement}
     */
    static async asyncGetImage(url) {
        const image = new Image();
        const promise = new Promise(resolve => image.onload = resolve);
        image.src = url;
        await promise;
        return image;
    }

    /**
     * @param {HTMLImageElement} image 
     * @param {number} x 
     * @param {number} y 
     * @param {number} [w=undefined] 
     * @param {number} [h=undefined] 
     */
    static image(image, x, y, w = undefined, h = undefined) {
        this.ctx.drawImage(image,
            x * this.displayMultiplier,
            y * this.displayMultiplier,
            w * this.displayMultiplier,
            h * this.displayMultiplier
        );
    }

    /**
     * @param {HTMLImageElement} image 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     * @param {number} cropX - The x position of the top left corner of the cropped region on the image
     * @param {number} cropY - The y position of the top left corner of the cropped region on the image
     * @param {number} cropW - The width of the cropped region
     * @param {number} cropH - The height of the cropped region
     */
    static croppedImage(image, x, y, w, h, cropX, cropY, cropW, cropH) {
        this.ctx.drawImage(image, cropX, cropY, cropW, cropH,
            x * this.displayMultiplier,
            y * this.displayMultiplier,
            w * this.displayMultiplier,
            h * this.displayMultiplier
        );
    }

    static font = 'Arial';

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {string} str - The displayed string
     * @param {number} size - Font size
     * @param {boolean} [center=false] - Weather the text will be centered on the x axis
     * @param {boolean} [bold=false] 
     */
    static text(x, y, str, size, center = false, bold = false) {
        this.ctx.textAlign = center ? 'center' : 'left'
        this.ctx.font = `${bold?'bold ':''}${size * this.displayMultiplier}px '${this.font}'`;
        this.ctx.fillText(str, x * this.displayMultiplier, y * this.displayMultiplier);
    }

    /**
     * @param {string} str - The measured string
     * @param {number} size - Font size
     * @param {boolean} [bold=false] 
     * @returns {TextMetrics}
     */
    static getTextSize(str, size, bold = false) {
        this.ctx.font = `${bold?'bold ':''}${size}px '${this.font}'`;
        return this.ctx.measureText(str);
    }
}
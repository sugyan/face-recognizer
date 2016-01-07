/* global $ */
class Main {
    constructor(canvas) {
        this.size = 300;
        this.canvas = canvas;
        this.canvas.width = this.canvas.height = this.size;
        this.ctx = canvas.getContext('2d');

        // image load
        this.image = new window.Image();
        this.image.onload = () => {
            // draw to canvas
            const h = this.image.height;
            const w = this.image.width;
            const scale = Math.max(w / this.size, h / this.size);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(
                this.image,
                (this.size - w / scale) / 2, (this.size - h / scale) / 2,
                w / scale, h / scale
            );
            // post to api
            $.ajax({
                url: '/api',
                method: 'POST',
                data: {
                    image: this.image.src
                },
                success: (result) => {
                    window.console.log(JSON.stringify(result));
                }
            });
        };
        this.image.onerror = () => {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            alert('Failed to load image.');
        };
        // drag and drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        this.canvas.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const reader = new window.FileReader();
            if (e.dataTransfer.files.length > 0) {
                reader.onload = (e) => {
                    this.image.src = e.target.result;
                };
                reader.readAsDataURL(e.dataTransfer.files[0]);
            }
        });
    }
    enableSelectFile(file) {
        file.addEventListener('change', (e) => {
            const reader = new window.FileReader();
            if (e.target.files.length > 0) {
                reader.onload = (e) => {
                    this.image.src = e.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const main = new Main(document.getElementById('canvas'));
    main.enableSelectFile(document.getElementById('file'));
});

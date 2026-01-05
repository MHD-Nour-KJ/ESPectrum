/**
 * ESPectrum - Animated Background
 * Slowly moving gradient orbs using Canvas
 */

export default class AnimatedBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.orbs = [];
        this.animationId = null;

        this.resize();
        this.init();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        // Create 5 floating orbs
        const colors = [
            { r: 104, g: 74, b: 255 },   // Primary
            { r: 255, g: 225, b: 74 },   // Secondary
            { r: 255, g: 134, b: 74 },   // Accent
            { r: 139, g: 111, b: 255 },  // Primary Light
            { r: 83, g: 57, b: 204 }     // Primary Dark
        ];

        for (let i = 0; i < 5; i++) {
            this.orbs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 100 + Math.random() * 200,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                color: colors[i]
            });
        }

        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw orbs
        this.orbs.forEach(orb => {
            // Update position
            orb.x += orb.vx;
            orb.y += orb.vy;

            // Bounce off edges
            if (orb.x < -orb.radius || orb.x > this.canvas.width + orb.radius) {
                orb.vx *= -1;
            }
            if (orb.y < -orb.radius || orb.y > this.canvas.height + orb.radius) {
                orb.vy *= -1;
            }

            // Draw radial gradient orb
            const gradient = this.ctx.createRadialGradient(
                orb.x, orb.y, 0,
                orb.x, orb.y, orb.radius
            );

            gradient.addColorStop(0, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0.4)`);
            gradient.addColorStop(0.5, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0.2)`);
            gradient.addColorStop(1, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                orb.x - orb.radius,
                orb.y - orb.radius,
                orb.radius * 2,
                orb.radius * 2
            );
        });

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', () => this.resize());
    }
}

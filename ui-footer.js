/**
 * ESPectrum - Global Footer Component
 * Contains animated "Connect" links
 */

export default class Footer {
  constructor(container) {
    this.container = container;
  }

  render() {
    this.container.innerHTML = `
      <div class="footer-wrapper">
         <div class="connect-section glass-card">
            <h3>Connect</h3>
            <div class="social-links">
                <!-- Email -->
                <a href="mailto:monourkh@gmail.com" class="social-btn" title="Email" target="_blank">
                    <i class="ph ph-envelope"></i>
                </a>
                
                <!-- Phone -->
                <a href="tel:+963984250250" class="social-btn" title="Phone">
                    <i class="ph ph-phone"></i>
                </a>

                <!-- Facebook -->
                <a href="https://www.facebook.com/share/17oHTbhc46/" class="social-btn" title="Facebook" target="_blank">
                    <i class="ph ph-facebook-logo"></i>
                </a>

                <!-- Instagram -->
                <a href="https://www.instagram.com/mhd_nour_kj?igsh=bHFlZjVnZHMzZnpz" class="social-btn" title="Instagram" target="_blank">
                    <i class="ph ph-instagram-logo"></i>
                </a>

                <!-- LinkedIn -->
                <a href="https://www.linkedin.com/in/mhd-nour-khaddam-aljamea-0387b71b9?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" class="social-btn" title="LinkedIn" target="_blank">
                    <i class="ph ph-linkedin-logo"></i>
                </a>

                <!-- WhatsApp -->
                <a href="https://wa.me/message/SEQH3L3UAOZEF1?src=qr" class="social-btn" title="WhatsApp" target="_blank">
                    <i class="ph ph-whatsapp-logo"></i>
                </a>
            </div>
         </div>
         <p class="copyright">© 2026 MHD Nour Khaddam Aljamea. All rights reserved.</p>
      </div>
    `;

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('footer-styles')) return;

    const style = document.createElement('style');
    style.id = 'footer-styles';
    style.textContent = `
      .footer-wrapper {
        margin-top: var(--spacing-xxl);
        padding: var(--spacing-xl) var(--spacing-lg);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-lg);
        width: 100%;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
      }

      .connect-section {
        padding: var(--spacing-lg) var(--spacing-xl);
        border: 1px solid var(--glass-border);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-md);
        background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
      }

      .connect-section h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--color-secondary); /* Fallback */
        background: linear-gradient(90deg, var(--color-primary-light), var(--color-secondary-light));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 10px 20px rgba(0,0,0,0.2);
      }

      .social-links {
        display: flex;
        gap: var(--spacing-md);
        flex-wrap: wrap;
        justify-content: center;
      }

      .social-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--glass-border);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        font-size: 1.5rem;
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }

      .social-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 1;
      }

      .social-btn i {
        position: relative;
        z-index: 2;
        transition: transform 0.3s ease;
      }

      .social-btn:hover {
        transform: translateY(-5px) scale(1.1);
        border-color: rgba(255,255,255,0.2);
        color: white;
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
      }

      .social-btn:hover::before {
        opacity: 1;
      }

      .social-btn:hover i {
        transform: scale(1.1);
      }

      .social-btn:active {
        transform: translateY(-2px) scale(0.95);
      }

      .copyright {
        color: var(--text-tertiary);
        font-size: 0.875rem;
        margin: 0;
      }

      @media (max-width: 480px) {
        .social-links {
            gap: var(--spacing-sm);
        }
        .social-btn {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

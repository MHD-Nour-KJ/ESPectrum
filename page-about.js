/**
 * ESPectrum - About Page
 * CV and Portfolio Showcase
 */

export default class AboutPage {
  constructor() {
    this.unsubscribe = null;
  }

  render(container) {
    container.innerHTML = `
      <div class="about-page fade-in">
        <!-- Hero Section -->
        <div class="about-hero glass-card">
          <div class="hero-content">
            <div class="profile-frame">
                <!-- Using the direct image link provided -->
                <img src="https://i.ibb.co/hJ57cwWb/1-1-ai-chairs.png" alt="MHD Nour Khaddam Aljamea" class="profile-img">
                <div class="glow-ring"></div>
            </div>
            <h1 style="margin-top: 0;">MHD Nour Khaddam Aljamea</h1>
            <p class="tagline">Computer Engineering Student</p>
            <p class="bio">A highly motivated and technically skilled Computer Engineering student with a strong foundation in electronics</p>
          </div>
        </div>

        <div class="grid-2">
            <!-- Education -->
            <div class="glass-card section-card">
                <h2><i class="ph ph-graduation-cap"></i> Education</h2>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="time">Expected 2027</div>
                        <div class="content">
                            <h3>Bachelor of Science in Computer and Automation Engineering</h3>
                            <p>University of Damascus, Damascus, Syria</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="time">Expected 2029</div>
                        <div class="content">
                            <h3>Bachelor of Business Administration</h3>
                            <p>University of the People</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Skills -->
            <div class="glass-card section-card">
                <h2><i class="ph ph-wrench"></i> Skills</h2>
                <div class="skills-grid">
                    <div class="skill-category">
                        <h3>Research</h3>
                        <p>Advanced Internet Research, efficient navigation of resources.</p>
                    </div>
                    <div class="skill-category">
                        <h3>Software</h3>
                        <div class="tags">
                            <span>AutoCAD Electrical</span>
                            <span>Eplan</span>
                            <span>Blender</span>
                            <span>SolidWorks</span>
                            <span>Proteus</span>
                            <span>PSim</span>
                            <span>Multisim</span>
                        </div>
                    </div>
                    <div class="skill-category">
                        <h3>Programming</h3>
                        <div class="tags">
                            <span>Flutter</span>
                            <span>Dart</span>
                            <span>C++ (Arduino)</span>
                        </div>
                    </div>
                    <div class="skill-category">
                        <h3>Languages</h3>
                        <div class="tags">
                            <span>English (C1)</span>
                            <span>Arabic (Native)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Work Experience -->
        <div class="glass-card section-card full-width">
            <h2><i class="ph ph-briefcase"></i> Work Experience</h2>
            <div class="timeline">
                <div class="timeline-item">
                    <div class="time">2023 - 2024</div>
                    <div class="content">
                        <h3>Solar Energy Installations</h3>
                        <p>Solar Cell, Damascus – Al-Midan</p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="time">2021 - 2022</div>
                    <div class="content">
                        <h3>Automation Intern</h3>
                        <p>Worked with an Automation Engineer, Damascus</p>
                        <p class="details">Assisted in the implementation of automation systems</p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="time">2021</div>
                    <div class="content">
                        <h3>Electronics Repair Technician</h3>
                        <p>Workshop, Damascus</p>
                        <p class="details">Diagnosed and repaired electronic devices, ensuring optimal performance.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Projects -->
        <div class="glass-card section-card full-width">
             <h2><i class="ph ph-rocket"></i> Projects</h2>
             <div class="projects-grid">
                <div class="project-item">
                    <h3>Automation System Design</h3>
                    <p>Assisted with the implementation of automation systems for many local manufacturing companies, utilizing PLCs, Actuators and sensors.</p>
                </div>
                <div class="project-item">
                    <h3>Electrical Panel Design</h3>
                    <p>Designed electrical panels for residential and commercial buildings using AutoCAD Electrical and Eplan.</p>
                </div>
                <div class="project-item">
                    <h3>3D Modeling</h3>
                    <p>Created 3D models of parts and assemblies using Blender and SolidWorks.</p>
                </div>
                <div class="project-item">
                    <h3>Electronic Circuits Design</h3>
                    <p>Designed so many Arduino & ESP32 & Raspberry Pi projects, available on GitHub.</p>
                </div>
             </div>
        </div>

        <!-- Volunteering -->
        <div class="glass-card section-card full-width">
            <h2><i class="ph ph-heart"></i> Volunteer Experience</h2>
            <div class="timeline">
                 <div class="timeline-item">
                    <div class="time">2025 (Jun - Dec)</div>
                    <div class="content">
                        <h3>Team Leader</h3>
                        <p>الفريق الإعلامي الجامعي التطوعي في كلية الهمك</p>
                        <p class="details">Planning for and organizing a great team where we covered events like the Conference of Renewable energies 2025 and FMEE Exhibition 2025.</p>
                    </div>
                </div>
                 <div class="timeline-item">
                    <div class="time">2024 - Now</div>
                    <div class="content">
                        <h3>Training Volunteer</h3>
                        <p>Microbots Team at EVOTECH</p>
                        <p class="details">Training trainees in Arduino & IoT courses.</p>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="time">2025 (Jan - Aug)</div>
                    <div class="content">
                        <h3>Video Editing</h3>
                        <p>Microbots Team</p>
                        <p class="details">Editing videos and making Reels for the Team’s Instagram & Facebook Pages.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Courses -->
        <div class="glass-card section-card full-width">
            <h2><i class="ph ph-certificate"></i> Courses & Certifications</h2>
            <ul class="cert-list">
                <li><strong>English Proficiency:</strong> C1 (Al Nubalaa' Institute)</li>
                <li><strong>Electronics Design:</strong> Walid Essa's courses, Arduino, IoT, Raspberry Pi (Microbots Team) and a Lego TOT Course and a XTOOLS S1 laser cutter Course at Syrian Research & Publication Society</li>
                <li><strong>Management:</strong> Coursera courses in Project Management, Team Building; Economic Feasibility study (منظمة بنفسج).</li>
            </ul>
        </div>
        
        <!-- Footer will be appended here globally by main app, but we can preserve space -->
      </div>
    `;

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('about-styles')) return;

    const style = document.createElement('style');
    style.id = 'about-styles';
    style.textContent = `
      .about-page {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
        width: 100%;
        max-width: 1200px; /* Slightly tighter for text readability */
      }

      .about-hero {
        text-align: center;
        padding: var(--spacing-xxl) var(--spacing-lg);
        background: radial-gradient(circle at center, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 70%);
      }
      
      .profile-frame {
        width: 180px;
        height: 180px;
        margin: var(--spacing-md) auto var(--spacing-sm);
        position: relative;
        border-radius: 50%;
        padding: 4px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      }
      
      .profile-img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid var(--background-dark);
        position: relative;
        z-index: 2;
      }
      
      .glow-ring {
        position: absolute;
        top: -10px; left: -10px; right: -10px; bottom: -10px;
        border-radius: 50%;
        background: radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%);
        opacity: 0.5;
        z-index: 1;
        filter: blur(10px);
        animation: pulse 3s infinite;
      }
      
      @keyframes pulse {
        0% { transform: scale(0.95); opacity: 0.5; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(0.95); opacity: 0.5; }
      }

      .tagline {
        font-size: 1.25rem;
        color: var(--color-primary-light);
        margin-bottom: var(--spacing-sm);
        font-weight: 500;
      }
      
      .bio {
        max-width: 600px;
        margin: 0 auto;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      .section-card {
        padding: var(--spacing-xl);
      }
      
      .section-card h2 {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
        color: var(--text-primary);
        border-bottom: 1px solid var(--glass-border);
        padding-bottom: var(--spacing-sm);
      }
      
      .section-card h2 i {
        color: var(--color-secondary);
      }

      /* Timeline Styles */
      .timeline {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
        position: relative;
        padding-left: var(--spacing-lg);
        border-left: 2px solid var(--glass-border);
      }
      
      .timeline-item {
        position: relative;
      }
      
      .timeline-item::before {
        content: '';
        position: absolute;
        left: calc(-1 * var(--spacing-lg) - 5px);
        top: 6px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-secondary);
        box-shadow: 0 0 10px var(--color-secondary);
      }
      
      .timeline-item .time {
        font-size: 0.875rem;
        color: var(--color-primary-light);
        margin-bottom: 0.25rem;
        font-weight: 600;
      }
      
      .timeline-item h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.1rem;
      }
      
      .timeline-item .details {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-top: 0.5rem;
      }

      /* Skills Grid */
      .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--spacing-lg);
      }
      
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      
      .tags span {
        padding: 4px 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 99px;
        font-size: 0.85rem;
        border: 1px solid var(--glass-border);
      }

      /* Projects Grid */
      .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-lg);
      }
      
      .project-item {
        background: rgba(255,255,255,0.02);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        transition: transform 0.2s;
      }
      
      .project-item:hover {
        transform: translateY(-5px);
        background: rgba(255,255,255,0.05);
      }
      
      .project-item h3 {
        color: var(--color-secondary-light);
        margin-top: 0;
      }

      .cert-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .cert-list li {
        padding: var(--spacing-sm) 0;
        border-bottom: 1px solid var(--glass-border);
      }
      
      .cert-list li:last-child {
        border-bottom: none;
      }

      @media (min-width: 768px) {
        .full-width {
            grid-column: span 2;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

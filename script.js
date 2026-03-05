// Ensure GSAP plugins are ready
gsap.registerPlugin(ScrollTrigger);

// ===================================
// THREE.JS SCENE SETUP
// ===================================

const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 6;

// Added depth fog that matches the background color but reacts to distant objects like earth's atmosphere
scene.fog = new THREE.FogExp2(0x05020a, 0.035);

// Renderer setup with antialiasing and alpha for background
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ===================================
// CREATE 3D MODEL (Colorful Torus Knot)
// ===================================

// Use a TorusKnot for an intricate, abstract "Graphic Design" feel
const geometry = new THREE.TorusKnotGeometry(1.5, 0.45, 200, 64);

// Create a stunning physical material to catch lights beautifully
const material = new THREE.MeshPhysicalMaterial({
    color: 0xff007f,            // Primary pink/magenta base
    metalness: 0.6,             // Metallic surface
    roughness: 0.2,             // Glossy reflection
    clearcoat: 1.0,             // Extra shiny layer
    clearcoatRoughness: 0.1,
    emissive: 0x1a0033          // Deep purple glow
});

// Create a Group to hold the model so we can separate GSAP scroll animations from idle continuous animations
const modelGroup = new THREE.Group();
scene.add(modelGroup);

const model = new THREE.Mesh(geometry, material);
model.userData = { clickOffsetX: 0, clickOffsetY: 0, clickOffsetZ: 0 };
modelGroup.add(model); // Add model to the group instead of directly to the scene

// ===================================
// ADD BACKGROUND ELEMENTS (Small & Medium)
// ===================================

const backgroundElements = [];
const smallGeometries = [
    new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.TorusGeometry(0.2, 0.1, 16, 32),
    new THREE.OctahedronGeometry(0.25, 0),
    new THREE.TetrahedronGeometry(0.3, 0),
    new THREE.SphereGeometry(0.2, 32, 32)
];

const mediumGeometries = [
    new THREE.IcosahedronGeometry(0.6, 0),
    new THREE.TorusGeometry(0.5, 0.15, 16, 50),
    new THREE.OctahedronGeometry(0.5, 0)
];

// Create 30 Small Elements and 10 Medium Elements randomly placed
function createFloatingElements(geometries, count) {
    for (let i = 0; i < count; i++) {
        // Pick a random geometry
        const randGeom = geometries[Math.floor(Math.random() * geometries.length)];

        // Use the same material so they sync with the 5-color theme loop
        const mesh = new THREE.Mesh(randGeom, material);

        // Random Position (spread wide across the background)
        mesh.position.set(
            (Math.random() - 0.5) * 25, // X
            (Math.random() - 0.5) * 20, // Y
            (Math.random() - 0.5) * 15 - 5 // Z (Push further back so they are truly background)
        );

        // Random Rotation
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Set random rotation speeds for the animation loop
        mesh.userData = {
            rotSpeedX: (Math.random() - 0.5) * 0.01,
            rotSpeedY: (Math.random() - 0.5) * 0.01,
            rotSpeedZ: (Math.random() - 0.5) * 0.01,
            floatSpeed: Math.random() * 0.5 + 0.5,
            floatOffset: Math.random() * Math.PI * 2 // Random starting phase for sine wave
        };

        scene.add(mesh); // Add direct to scene so they don't move with the GSAP ScrollTrigger modelGroup
        backgroundElements.push(mesh);
    }
}

createFloatingElements(smallGeometries, 35);
createFloatingElements(mediumGeometries, 12);

// ===================================
// ADD SMALL MOVING DUST PARTICLES
// ===================================

const dustCount = 2000; // Lots of tiny dust particles
const dustGeometry = new THREE.BufferGeometry();
const dustPositions = new Float32Array(dustCount * 3);
const dustVelocities = [];

for (let i = 0; i < dustCount * 3; i += 3) {
    // Spread the dust all around the foreground and background!
    dustPositions[i] = (Math.random() - 0.5) * 40;     // X
    dustPositions[i + 1] = (Math.random() - 0.5) * 40; // Y
    dustPositions[i + 2] = (Math.random() - 0.5) * 30 - 5; // Z

    // Add unique velocities for each particle so they drift
    dustVelocities.push({
        x: (Math.random() - 0.5) * 0.005,
        y: (Math.random() - 0.5) * 0.005 + 0.002, // Generally drifting upwards slightly
        z: (Math.random() - 0.5) * 0.005
    });
}

dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

// Create a circular glowing texture for the dust internally
const dustCanvas = document.createElement('canvas');
dustCanvas.width = 16;
dustCanvas.height = 16;
const dustCtx = dustCanvas.getContext('2d');
const dustGradient = dustCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
dustGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
dustGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
dustCtx.fillStyle = dustGradient;
dustCtx.fillRect(0, 0, 16, 16);
const dustTexture = new THREE.CanvasTexture(dustCanvas);

const dustMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15, // Tiny size
    map: dustTexture,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
scene.add(dustParticles);

// ===================================
// INTERACTIVITY: CLICK TO DISAPPEAR (5 seconds)
// ===================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('click', (event) => {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray (including main model)
    const objectsToCheck = [model, ...backgroundElements];
    const intersects = raycaster.intersectObjects(objectsToCheck);

    if (intersects.length > 0) {
        // We only want to interact with the first object we hit (closest one)
        const clickedMesh = intersects[0].object;

        if (clickedMesh === model) {
            // Main Model Click Logic - Dodge!
            const directions = [
                { x: -4, y: 0 }, // left
                { x: 4, y: 0 },  // right
                { x: 0, y: 3 },  // top
                { x: 0, y: -3 }  // bottom
            ];
            const dir = directions[Math.floor(Math.random() * directions.length)];

            gsap.killTweensOf(model.userData);

            // Using power2.out so it doesn't "bounce" and look like it's zooming
            gsap.to(model.userData, {
                clickOffsetX: dir.x,
                clickOffsetY: dir.y,
                duration: 0.5,
                ease: "power2.out"
            });

            // Show Glassmorphism Popup behind the 3D model
            const popup = document.getElementById('touch-popup');
            popup.style.display = 'block';
            gsap.fromTo(popup,
                { opacity: 0, scale: 0.8 },
                { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }
            );

            // Flag that the model is displaced so scroll can reset it
            window.isModelDisplaced = true;
            return;
        }

        // Background Element Click Logic - Disappear
        // Skip if it's already hidden to prevent spam clicking
        if (clickedMesh.userData.isHidden) return;

        clickedMesh.userData.isHidden = true;

        // Animate out (shrink to zero scale)
        gsap.to(clickedMesh.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.5,
            ease: "back.in(1.7)", // Fun popping out animation
            onComplete: () => {
                // Wait 5 seconds to animate back in
                setTimeout(() => {
                    gsap.to(clickedMesh.scale, {
                        x: 1,
                        y: 1,
                        z: 1,
                        duration: 0.8,
                        ease: "elastic.out(1, 0.4)", // Bouncy popping back in animation
                        onComplete: () => {
                            clickedMesh.userData.isHidden = false;
                        }
                    });
                }, 5000); // 5000 ms = 5 seconds
            }
        });
    }
});

// Reset main model position on scroll
window.addEventListener('scroll', () => {
    if (window.isModelDisplaced) {
        window.isModelDisplaced = false;

        // Revert model to center
        gsap.to(model.userData, {
            clickOffsetX: 0,
            clickOffsetY: 0,
            clickOffsetZ: 0,
            duration: 0.8,
            ease: "power2.out"
        });

        // Hide popup
        const popup = document.getElementById('touch-popup');
        gsap.to(popup, {
            opacity: 0, scale: 0.8, duration: 0.3, onComplete: () => {
                popup.style.display = 'none';
            }
        });
    }
});

// ===================================
// LIGHTING SETUP (Vibrant Colors)
// ===================================

// Dim ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Bright Cyan Light from top right
const pointLight1 = new THREE.PointLight(0x00f0ff, 2.5, 50);
pointLight1.position.set(5, 5, 5);
scene.add(pointLight1);

// Deep Purple Light from bottom left
const pointLight2 = new THREE.PointLight(0x7000ff, 2.5, 50);
pointLight2.position.set(-5, -5, 2);
scene.add(pointLight2);

// Hot Pink Light from the front center
const pointLight3 = new THREE.PointLight(0xff007f, 2, 50);
pointLight3.position.set(0, 0, 8);
scene.add(pointLight3);


// ===================================
// ANIMATION LOOP & SCROLL FIX
// ===================================

const clock = new THREE.Clock();
let mouseX = 0;
let mouseY = 0;

// Add slight mouse interactivity
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Idle automatic continuous rotation applied ONLY to the inner model
    model.rotation.y += 0.003;
    model.rotation.x += 0.002;
    model.rotation.z += 0.001;

    // Floating effect and click offset applied to the inner model
    model.position.x = model.userData.clickOffsetX;
    model.position.y = model.userData.clickOffsetY + Math.sin(elapsedTime * 0.8) * 0.15;
    model.position.z = model.userData.clickOffsetZ;

    // Animate the small & medium background elements
    backgroundElements.forEach(mesh => {
        // Continuous rotation
        mesh.rotation.x += mesh.userData.rotSpeedX;
        mesh.rotation.y += mesh.userData.rotSpeedY;
        mesh.rotation.z += mesh.userData.rotSpeedZ;

        // Slight bobbing/floating based on time
        mesh.position.y += Math.sin(elapsedTime * mesh.userData.floatSpeed + mesh.userData.floatOffset) * 0.005;
    });

    // Animate the dust particles drifting
    const positions = dustParticles.geometry.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        const vel = dustVelocities[i];

        positions[i3] += vel.x;     // X
        positions[i3 + 1] += vel.y; // Y
        positions[i3 + 2] += vel.z; // Z

        // Wrap around if they go out of bounds
        if (positions[i3 + 1] > 20) positions[i3 + 1] = -20;
        if (positions[i3 + 1] < -20) positions[i3 + 1] = 20;
        if (positions[i3] > 20) positions[i3] = -20;
        if (positions[i3] < -20) positions[i3] = 20;
    }
    dustParticles.geometry.attributes.position.needsUpdate = true;

    // Slowly rotate the entire dust particle system for extra depth
    dustParticles.rotation.y = elapsedTime * 0.02;

    // Mouse parallax effect
    camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
    camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// Handle Window Resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});


// ===================================
// GSAP SCROLLTRIGGER ANIMATIONS
// ===================================

// Helper function to get a random vibrant Three.js Color
function getRandomVibrantColor() {
    return new THREE.Color(Math.random() * 0xffffff);
}

// Animate the OUTER modelGroup with GSAP so it doesn't conflict with inner model continuous animation!
// Create one continuous timeline that stretches from the very top (header) to the very bottom (footer)
const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5 // Smooth scrubbing the whole way down
    }
});

// Set initial position of the model to where it used to be at the footer
modelGroup.position.set(0, 0.5, 1);
modelGroup.rotation.set(Math.PI * 2, Math.PI * 2.5, 0);

// Phase 1 (Starts moving towards Portfolio area as we scroll down)
tl.to(modelGroup.position, { x: 2.5, y: 1.5, z: -3, ease: "power1.inOut" }, 0)
    .to(modelGroup.rotation, { x: Math.PI * 1.5, y: Math.PI * 1.5, ease: "power1.inOut" }, 0)
    // Phase 2 (Ends at the About Section area layout when we reach the footer)
    .to(modelGroup.position, { x: -2.5, z: -1, ease: "power1.inOut" }, 0.5)
    .to(modelGroup.rotation, { x: Math.PI * 0.5, y: Math.PI * 0.8, ease: "power1.inOut" }, 0.5);


// ===================================
// AUTOMATIC 5-COLOR THEME LOOP (Header to Footer)
// ===================================

const palettes = [
    { p: '#ff007f', s: '#00f0ff', t: '#7000ff', m: new THREE.Color(0xff007f) },
    { p: '#ffae00', s: '#ff007f', t: '#ff0000', m: new THREE.Color(0xffae00) },
    { p: '#00ff88', s: '#00f0ff', t: '#00ff00', m: new THREE.Color(0x00ff88) },
    { p: '#ff00ff', s: '#ffae00', t: '#ffff00', m: new THREE.Color(0xff00ff) },
    { p: '#00f0ff', s: '#7000ff', t: '#ff007f', m: new THREE.Color(0x00f0ff) }
];

let currentPaletteIndex = 0;

function shiftThemeColors() {
    currentPaletteIndex = (currentPaletteIndex + 1) % palettes.length;
    const nextPalette = palettes[currentPaletteIndex];

    // Animate CSS Variables on the root html element smoothly
    gsap.to("html", {
        "--primary": nextPalette.p,
        "--secondary": nextPalette.s,
        "--tertiary": nextPalette.t,
        duration: 2.5,
        ease: "power2.inOut"
    });

    // Animate Three.js 3D Model Material Color smoothly
    gsap.to(material.color, {
        r: nextPalette.m.r,
        g: nextPalette.m.g,
        b: nextPalette.m.b,
        duration: 2.5,
        ease: "power2.inOut"
    });
}

// Start infinite loop, changing every 4.5 seconds
setInterval(shiftThemeColors, 4500);

// ===================================
// RANDOM COLOR HOVER EFFECT FOR HEADINGS
// ===================================
const headings = document.querySelectorAll('h1, h2, h3');

headings.forEach(heading => {
    // Save original styles to revert back on mouseleave, or let it stay colorful!
    // We'll let it stay colorful for a vibrant, dynamic aesthetic.
    heading.style.transition = 'all 0.4s ease';

    heading.addEventListener('mouseenter', () => {
        // Generate random vibrant hex colors
        const randomColor1 = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const randomColor2 = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const randomColor3 = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        // Check if it's the main H1 which has gradient styling
        if (heading.tagName.toLowerCase() === 'h1' || getComputedStyle(heading).webkitBackgroundClip === 'text') {
            heading.style.backgroundImage = `linear-gradient(45deg, ${randomColor1}, ${randomColor2}, ${randomColor3})`;
            heading.style.textShadow = `0px 5px 30px ${randomColor1}88`; // 88 is hex for transparency
        } else {
            // For other headings
            heading.style.color = randomColor1;
            heading.style.textShadow = `0 0 20px ${randomColor1}88`;

            // If it originally had a text-fill-color transparent, we need to reset it to apply direct color
            heading.style.webkitTextFillColor = 'initial';
        }
    });

    // Optional: Revert on mouseleave (uncomment if you want it to revert)
    /*
    heading.addEventListener('mouseleave', () => {
        heading.style.backgroundImage = '';
        heading.style.color = '';
        heading.style.textShadow = '';
        heading.style.webkitTextFillColor = '';
    });
    */
});

// ===================================
// PROFILE IMAGE FACE SWAP (GLITCH)
// ===================================
const profileImg = document.querySelector('.profile-img');
if (profileImg) {
    let isFlipping = false;
    profileImg.style.cursor = 'pointer';

    profileImg.addEventListener('click', () => {
        if (isFlipping) return;
        isFlipping = true;

        // Apply glitch effect
        profileImg.classList.add('glitch-anim');

        // Swap image after short 300ms glitch duration
        setTimeout(() => {
            profileImg.src = 'profile_mad.png';
            profileImg.classList.remove('glitch-anim');

            // Wait 5 seconds, glitch again, restore original image
            setTimeout(() => {
                profileImg.classList.add('glitch-anim');

                setTimeout(() => {
                    profileImg.src = 'profile.png';
                    profileImg.classList.remove('glitch-anim');
                    isFlipping = false;
                }, 300); // 300ms glitch to restore

            }, 5000); // 5 seconds mad state

        }, 300); // 300ms glitch to transition
    });
}

// ===================================
// HEADER LOGO LETTER CLICK ANIMATION
// ===================================
const headerLogo = document.querySelector('header .logo');
if (headerLogo) {
    // "Asif<span>Ansari</span>" is the HTML, so we extract text to keep styling
    const text1 = "Asif";
    const text2 = "Ansari";
    headerLogo.innerHTML = ''; // Clear existing

    // Function to create flippable spans
    const appendFlippableLetters = (text, isSecondaryColor) => {
        const container = isSecondaryColor ? document.createElement('span') : headerLogo;

        text.split('').forEach(char => {
            const span = document.createElement('span');
            span.style.display = 'inline-block';
            span.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            span.style.cursor = 'pointer';
            span.innerText = char;

            span.addEventListener('click', (e) => {
                e.stopPropagation();
                span.style.transform = 'rotateX(180deg) rotateY(180deg)';
                span.dataset.flipped = "true";
            });

            container.appendChild(span);
        });

        if (isSecondaryColor) {
            headerLogo.appendChild(container);
        }
    };

    appendFlippableLetters(text1, false);
    appendFlippableLetters(text2, true);

    // Revert all flipped letters when the mouse leaves the logo area
    headerLogo.addEventListener('mouseleave', () => {
        const spans = headerLogo.querySelectorAll('span');
        spans.forEach(span => {
            if (span.dataset.flipped === "true") {
                span.style.transform = 'none';
                span.dataset.flipped = "false";
            }
        });
    });
}


// ===================================
// FOOTER TEXT LETTER CLICK ANIMATION
// ===================================

const footerName = document.querySelector('.footer-content h3');
if (footerName) {
    // Save the original text
    const text = footerName.innerText;
    // Clear the element
    footerName.innerHTML = '';

    // Split text into individual span elements for each letter
    text.split('').forEach(char => {
        const span = document.createElement('span');

        if (char === ' ') {
            span.innerHTML = '&nbsp;'; // Preserve spaces
        } else {
            span.innerText = char;
            // Add click event to flip it upside down
            span.addEventListener('click', (e) => {
                // Prevent the hover effect of the parent from getting interrupted weirdly
                e.stopPropagation();

                span.classList.add('flipped');

                // Remove the class after 1 second to return it to normal
                setTimeout(() => {
                    span.classList.remove('flipped');
                }, 1000);
            });
        }

        footerName.appendChild(span);
    });
}

// ===================================
// COPY PROTECTION (Prevent right-click & shortcuts)
// ===================================

// Disable right-click context menu
document.addEventListener('contextmenu', event => event.preventDefault());

// Disable copy, cut, paste
document.addEventListener('copy', event => event.preventDefault());
document.addEventListener('cut', event => event.preventDefault());
document.addEventListener('paste', event => event.preventDefault());

// Disable common keyboard shortcuts (Ctrl+C, Ctrl+A, Ctrl+U, F12)
document.addEventListener('keydown', (event) => {
    if (
        (event.ctrlKey && (event.key === 'c' || event.key === 'C')) || // Copy
        (event.ctrlKey && (event.key === 'a' || event.key === 'A')) || // Select All
        (event.ctrlKey && (event.key === 'u' || event.key === 'U')) || // View Source
        (event.ctrlKey && (event.key === 's' || event.key === 'S')) || // Save As
        event.key === 'F12' // Developer Tools
    ) {
        event.preventDefault();
    }
});

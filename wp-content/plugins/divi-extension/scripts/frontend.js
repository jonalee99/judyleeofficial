jQuery(function($) {
    'use strict';

    var DiviGalleryHandler = {
        resizeTimer: null,
        sliderStates: {}, // Para trackear el estado de cada slider

        // Enhanced method to get responsive values with consistent breakpoints
        getResponsiveValue: function($gallery, paramName, defaultDesktop, defaultTablet, defaultMobile) {
            const windowWidth = window.innerWidth;
            const isVisualBuilder = $('body').hasClass('et-fb');
            
            // Make sure to read data attribute values correctly
            let desktopValue = $gallery.data(paramName);
            desktopValue = (desktopValue !== undefined && desktopValue !== '') ? desktopValue : defaultDesktop;
            
            let tabletValue = $gallery.data(paramName + '-tablet');
            tabletValue = (tabletValue !== undefined && tabletValue !== '') ? tabletValue : defaultTablet;
            
            let mobileValue = $gallery.data(paramName + '-phone');
            mobileValue = (mobileValue !== undefined && mobileValue !== '') ? mobileValue : defaultMobile;
            
            // In Visual Builder, detect current view
            if (isVisualBuilder) {
                if ($('.et-fb-preview--phone').length || $('body').hasClass('et-fb-preview-phone')) {
                    return mobileValue;
                } else if ($('.et-fb-preview--tablet').length || $('body').hasClass('et-fb-preview-tablet')) {
                    return tabletValue;
                } else {
                    return desktopValue;
                }
            } else if (windowWidth > 980) { // Desktop: > 980px
                return desktopValue;
            } else if (windowWidth >= 768 && windowWidth <= 980) { // Tablet: 768px - 980px
                return tabletValue;
            } else { // Mobile: < 768px
                return mobileValue;
            }
        },

        // Detectar Safari
        isSafari: function() {
            return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        },

        init: function() {
            this.initResponsive();
            this.bindEvents();
            this.initLightbox();
            this.initSliders(); // Initialize sliders
            
            // Additional update trigger after complete load
            $(window).on('load', () => {
                this.updateLayout();
                this.applyPortraitStyles();
                this.ensureInfiniteScroll(); // Ensure infinite scroll
                this.fixSliderNavigationPosition(); // Fix slider navigation position
            });
        },

        initResponsive: function() {
            this.updateLayout();
        },

        // Function to ensure infinite scroll
        ensureInfiniteScroll: function() {
            $('.dicm-gallery[data-gallery-layout="slider"]').each(function() {
                const $gallery = $(this);
                const $track = $gallery.find('.slider-track');
                const $items = $gallery.find('.dicm-gallery-item');
                
                if ($items.length === 0) return;
                
                // Calculate total width of all elements
                let totalWidth = 0;
                let viewportWidth = $gallery.width();
                
                $items.each(function() {
                    totalWidth += $(this).outerWidth(true);
                });
                
                // If we have enough elements to cover the viewport at least three times, do nothing
                if (totalWidth > viewportWidth * 3) return;
                
                // If not enough elements, clone as many as needed
                const originalItems = $items.toArray();
                let cloneCount = Math.ceil((viewportWidth * 3) / totalWidth) - 1;
                
                for (let i = 0; i < cloneCount; i++) {
                    $(originalItems).each(function() {
                        const $clone = $(this).clone(true);
                        $track.append($clone);
                    });
                }
            });
        },

        // Function to initialize sliders - VERSIÓN CON TRANSICIONES MEJORADAS Y NAVEGACIÓN INFERIOR
        initSliders: function() {
            const self = this;
            
            $('.dicm-gallery[data-gallery-layout="slider"]').each(function() {
                const $gallery = $(this);
                const galleryId = $gallery.attr('id') || 'gallery_' + Math.random().toString(36).substr(2, 9);
                $gallery.attr('id', galleryId);
                
                const autoSlide = $gallery.data('auto-slide') || 'on';
                const pauseOnHover = $gallery.data('pause-on-hover') || 'on';
                const showNavigation = $gallery.data('show-navigation') || 'off';
                const navigationPosition = $gallery.data('navigation-position') || 'inside';
                const sliderSpeed = $gallery.data('slider-speed') || 20;
                
                // Inicializar estado del slider
                self.sliderStates[galleryId] = {
                    currentOffset: 0,
                    isAnimating: false,
                    autoSlideEnabled: autoSlide === 'on',
                    animationId: null,
                    isPaused: false
                };
                
                const $track = $gallery.find('.slider-track');
                
                // Configurar el track para transiciones suaves
                $track.css({
                    'will-change': 'transform',
                    'backface-visibility': 'hidden',
                    'perspective': '1000px'
                });
                
                // Handle auto slide
                if (autoSlide === 'on') {
                    // Aplicar animación CSS con configuración optimizada
                    $track.css({
                        'animation': `dicm_scroll ${sliderSpeed}s linear infinite`,
                        'transform': 'translateX(0)',
                        'animation-play-state': 'running'
                    });
                    
                    // Pause on hover if enabled con transición suave
                    if (pauseOnHover === 'on') {
                        $gallery.on('mouseenter.slider', function() {
                            if (!self.sliderStates[galleryId].isAnimating) {
                                $track.css('animation-play-state', 'paused');
                                self.sliderStates[galleryId].isPaused = true;
                            }
                        }).on('mouseleave.slider', function() {
                            if (!self.sliderStates[galleryId].isAnimating) {
                                $track.css('animation-play-state', 'running');
                                self.sliderStates[galleryId].isPaused = false;
                            }
                        });
                    }
                } else {
                    // If auto slide is disabled, remove animation
                    $track.css('animation', 'none');
                }
                
                // Configure manual navigation if enabled
                if (showNavigation === 'on') {
                    let $prevBtn, $nextBtn;
                    
                    if (navigationPosition === 'bottom') {
                        // Para navegación inferior, buscar los botones fuera del contenedor principal
                        const $navigation = $gallery.next('.slider-navigation');
                        $prevBtn = $navigation.find('.slider-prev');
                        $nextBtn = $navigation.find('.slider-next');
                    } else {
                        // Para navegación inside/outside, buscar dentro del contenedor
                        $prevBtn = $gallery.find('.slider-prev');
                        $nextBtn = $gallery.find('.slider-next');
                    }
                    
                    // Remove any existing event handlers
                    $prevBtn.off('click.slider');
                    $nextBtn.off('click.slider');
                    
                    // Add visual feedback for navigation buttons
                    $prevBtn.add($nextBtn).css({
                        'transition': 'all 0.2s ease',
                        'cursor': 'pointer'
                    });
                    
                    // Hover effects for better UX
                    if (navigationPosition === 'bottom') {
                        // Efectos específicos para navegación inferior
                        $prevBtn.add($nextBtn).on('mouseenter', function() {
                            $(this).css({
                                'transform': 'scale(1.1)',
                                'opacity': '0.9'
                            });
                        }).on('mouseleave', function() {
                            $(this).css({
                                'transform': 'scale(1)',
                                'opacity': '1'
                            });
                        });
                    } else {
                        // Efectos para navegación inside/outside
                        $prevBtn.add($nextBtn).on('mouseenter', function() {
                            $(this).css({
                                'transform': 'translateY(-50%) scale(1.1)',
                                'opacity': '0.9'
                            });
                        }).on('mouseleave', function() {
                            $(this).css({
                                'transform': 'translateY(-50%) scale(1)',
                                'opacity': '1'
                            });
                        });
                    }
                    
                    // Handle manual navigation with improved event handling
                    $prevBtn.on('click.slider', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Feedback visual al hacer clic
                        if (navigationPosition === 'bottom') {
                            $(this).css('transform', 'scale(0.95)');
                            setTimeout(() => {
                                $(this).css('transform', 'scale(1)');
                            }, 150);
                        } else {
                            $(this).css('transform', 'translateY(-50%) scale(0.95)');
                            setTimeout(() => {
                                $(this).css('transform', 'translateY(-50%) scale(1)');
                            }, 150);
                        }
                        
                        self.navigateSlider($gallery, 'prev');
                    });
                    
                    $nextBtn.on('click.slider', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Feedback visual al hacer clic
                        if (navigationPosition === 'bottom') {
                            $(this).css('transform', 'scale(0.95)');
                            setTimeout(() => {
                                $(this).css('transform', 'scale(1)');
                            }, 150);
                        } else {
                            $(this).css('transform', 'translateY(-50%) scale(0.95)');
                            setTimeout(() => {
                                $(this).css('transform', 'translateY(-50%) scale(1)');
                            }, 150);
                        }
                        
                        self.navigateSlider($gallery, 'next');
                    });
                    
                    // Keyboard navigation support
                    $gallery.attr('tabindex', '0').on('keydown.slider', function(e) {
                        if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            self.navigateSlider($gallery, 'prev');
                        } else if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            self.navigateSlider($gallery, 'next');
                        }
                    });
                }
                
                // Ensure enough elements for infinite scroll
                self.ensureInfiniteScroll();
            });
            
            // Fix navigation position
            this.fixSliderNavigationPosition();
        },
        
        // Method to handle slider navigation - VERSIÓN CON TRANSICIÓN SUAVE
        navigateSlider: function($gallery, direction) {
            const galleryId = $gallery.attr('id');
            const state = this.sliderStates[galleryId];
            
            if (!state || state.isAnimating) {
                return; // Prevenir clics múltiples
            }
            
            state.isAnimating = true;
            
            const $track = $gallery.find('.slider-track');
            const $firstItem = $gallery.find('.dicm-gallery-item').first();
            const sliderSpeed = $gallery.data('slider-speed') || 20;
            const autoSlide = $gallery.data('auto-slide') || 'on';
            
            if ($firstItem.length === 0) {
                state.isAnimating = false;
                return;
            }
            
            // Obtener ancho del item incluyendo márgenes
            const itemWidth = $firstItem.outerWidth(true);
            
            // DETENER completamente la animación CSS
            $track.css({
                'animation': 'none',
                'animation-play-state': 'paused'
            });
            
            // Obtener la posición actual del transform
            const currentTransform = $track.css('transform');
            let currentX = 0;
            
            if (currentTransform && currentTransform !== 'none') {
                const matrix = currentTransform.match(/matrix.*\((.+)\)/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    currentX = parseFloat(values[4]) || 0;
                }
            }
            
            // Preparar elementos según la dirección ANTES de la transición
            if (direction === 'prev') {
                // Para retroceder, mover el último elemento al principio sin que se vea
                const $lastItem = $gallery.find('.dicm-gallery-item').last();
                $lastItem.prependTo($track);
                
                // Ajustar la posición para compensar el elemento añadido
                $track.css({
                    'transform': `translateX(${currentX - itemWidth}px)`,
                    'transition': 'none'
                });
                
                // Forzar repaint
                $track[0].offsetHeight;
                
                // Ahora animar hacia la posición final
                requestAnimationFrame(() => {
                    $track.css({
                        'transition': 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        'transform': `translateX(${currentX}px)`
                    });
                });
                
            } else {
                // Para avanzar, animar hacia la izquierda
                $track.css({
                    'transition': 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    'transform': `translateX(${currentX - itemWidth}px)`
                });
            }
            
            // Después de la transición suave (500ms), reorganizar y resetear
            setTimeout(() => {
                // Remover la transición temporalmente
                $track.css('transition', 'none');
                
                if (direction === 'next') {
                    // Para avanzar, mover el primer elemento al final
                    const $firstItemNow = $gallery.find('.dicm-gallery-item').first();
                    $firstItemNow.appendTo($track);
                }
                
                // Resetear posición a 0 sin animación
                $track.css('transform', 'translateX(0)');
                
                // Forzar repaint
                $track[0].offsetHeight;
                
                // Reiniciar animación automática si está habilitada
                if (autoSlide === 'on') {
                    setTimeout(() => {
                        $track.css({
                            'animation': `dicm_scroll ${sliderSpeed}s linear infinite`,
                            'animation-play-state': 'running'
                        });
                    }, 100);
                }
                
                state.isAnimating = false;
            }, 500); // Coincide con la duración de la transición
        },

        // Function to fix slider navigation position - ACTUALIZADA PARA NAVEGACIÓN INFERIOR
        fixSliderNavigationPosition: function() {
            $('.dicm-gallery[data-gallery-layout="slider"]').each(function() {
                const $gallery = $(this);
                const showNavigation = $gallery.data('show-navigation') || 'off';
                const navigationPosition = $gallery.data('navigation-position') || 'inside';
                
                if (showNavigation === 'on') {
                    if (navigationPosition === 'bottom') {
                        // Para navegación inferior, buscar fuera del contenedor principal
                        const $navigation = $gallery.next('.slider-navigation');
                        
                        if ($navigation.length) {
                            $navigation.css({
                                'position': 'relative',
                                'top': 'auto',
                                'left': 'auto',
                                'width': 'auto',
                                'height': 'auto',
                                'display': 'flex',
                                'justify-content': 'center',
                                'align-items': 'center',
                                'gap': '15px',
                                'margin-top': '20px',
                                'pointer-events': 'auto',
                                'z-index': '10'
                            });
                            
                            // Style navigation buttons for bottom position
                            $navigation.find('.slider-nav-btn').css({
                                'position': 'relative',
                                'top': 'auto',
                                'left': 'auto',
                                'right': 'auto',
                                'transform': 'none',
                                'margin': '0',
                                'display': 'flex',
                                'align-items': 'center',
                                'justify-content': 'center',
                                'cursor': 'pointer',
                                'user-select': 'none',
                                'pointer-events': 'auto',
                                'z-index': '20'
                            });
                            
                            // Ensure SVG icons are displayed properly
                            $navigation.find('.slider-nav-btn svg').css('display', 'block');
                        }
                    } else {
                        // Para navegación inside/outside, usar la lógica existente
                        // Ensure the gallery container has position: relative
                        $gallery.css('position', 'relative');
                        
                        // Configure navigation container
                        $gallery.find('.slider-navigation').css({
                            'position': 'absolute',
                            'top': '0',
                            'left': '0',
                            'width': '100%',
                            'height': '100%',
                            'pointer-events': 'none',
                            'z-index': '10'
                        });
                        
                        // Style navigation buttons
                        $gallery.find('.slider-nav-btn').css({
                            'position': 'absolute',
                            'top': '50%',
                            'transform': 'translateY(-50%)',
                            'pointer-events': 'auto',
                            'z-index': '20',
                            'display': 'flex',
                            'align-items': 'center',
                            'justify-content': 'center',
                            'cursor': 'pointer',
                            'user-select': 'none'
                        });
                        
                        // Position based on setting
                        if (navigationPosition === 'outside') {
                            $gallery.find('.slider-prev').css('left', '-60px');
                            $gallery.find('.slider-next').css('right', '-60px');
                        } else {
                            // inside position
                            $gallery.find('.slider-prev').css('left', '10px');
                            $gallery.find('.slider-next').css('right', '10px');
                        }
                        
                        // Ensure SVG icons are displayed properly
                        $gallery.find('.slider-nav-btn svg').css('display', 'block');
                    }
                }
            });
        },

        // Function to apply styles to portrait images
        applyPortraitStyles: function() {
            $('.dicm-gallery[data-gallery-layout="grid"] .dicm-gallery-item img').each(function() {
                const $img = $(this);
                if ($img[0].naturalHeight > $img[0].naturalWidth) {
                    $img.attr('style', $img.attr('style') + '; object-position: 50% 20% !important');
                }
            });
        },

        // Función mejorada para ajustar el layout justified
        adjustJustifiedLayout: function($gallery, gap) {
            const isSafari = this.isSafari();
            
            if (isSafari) {
                // Para Safari, asegurar que el contenedor tenga las propiedades correctas
                $gallery.css({
                    'display': '-webkit-flex',
                    'display': 'flex',
                    '-webkit-flex-wrap': 'wrap',
                    'flex-wrap': 'wrap',
                    'width': '100%',
                    'gap': `${gap}px`,
                    '-webkit-align-items': 'stretch',
                    'align-items': 'stretch',
                    '-webkit-justify-content': 'center',
                    'justify-content': 'center'
                });
                
                // Forzar redibujado en Safari
                setTimeout(() => {
                    $gallery.hide().show(0);
                }, 10);
            }
        },

        // Función mejorada para manejar el layout justified
        justifiedLayoutHandler: function($gallery) {
            const self = this;
            
            // Use enhanced getResponsiveValue method
            const imageHeight = self.getResponsiveValue(
                $gallery, 
                'image-height', 
                300, 
                250, 
                200
            );

            const gap = self.getResponsiveValue(
                $gallery, 
                'gap', 
                15, 
                12, 
                10
            );

            // Detectar si es Safari
            const isSafari = self.isSafari();
            
            // Para Safari, usar un enfoque diferente
            if (isSafari) {
                // Aplicar estilos base compatibles con Safari
                const safariStyles = {
                    'display': '-webkit-flex',
                    'display': 'flex',
                    '-webkit-flex-wrap': 'wrap',
                    'flex-wrap': 'wrap',
                    'width': '100%',
                    'gap': `${gap}px`,
                    '-webkit-align-items': 'stretch',
                    'align-items': 'stretch',
                    '-webkit-justify-content': 'center',
                    'justify-content': 'center'
                };
                
                // Aplicar estilos usando método nativo de jQuery
                Object.keys(safariStyles).forEach(property => {
                    $gallery[0].style.setProperty(property, safariStyles[property], 'important');
                });
                
                // Procesar imágenes de forma compatible con Safari
                const processImagesForSafari = function() {
                    const $items = $gallery.find('.dicm-gallery-item');
                    let processedCount = 0;
                    
                    $items.each(function(index) {
                        const $item = $(this);
                        const $img = $item.find('img');
                        
                        // Función para procesar cada imagen
                        const processImage = function() {
                            let width = $img[0].naturalWidth;
                            let height = $img[0].naturalHeight;
                            
                            // Si las dimensiones no están disponibles, usar valores por defecto
                            if (!width || !height || width === 0 || height === 0) {
                                width = parseInt($img.data('original-width')) || 300;
                                height = parseInt($img.data('original-height')) || 200;
                            }
                            
                            const aspectRatio = width / height;
                            const calculatedWidth = Math.round(imageHeight * aspectRatio);
                            
                            // Aplicar estilos usando setProperty para Safari
                            const itemStyles = {
                                '-webkit-flex-basis': `${calculatedWidth}px`,
                                'flex-basis': `${calculatedWidth}px`,
                                'max-width': `${calculatedWidth}px`,
                                'min-width': `${calculatedWidth}px`,
                                'width': `${calculatedWidth}px`,
                                'height': `${imageHeight}px`,
                                'position': 'relative',
                                'overflow': 'hidden',
                                '-webkit-flex-grow': '1',
                                'flex-grow': '1'
                            };
                            
                            Object.keys(itemStyles).forEach(property => {
                                $item[0].style.setProperty(property, itemStyles[property], 'important');
                            });

                            const imgStyles = {
                                'width': '100%',
                                'height': '100%',
                                'object-fit': 'cover',
                                'object-position': 'center',
                                'display': 'block'
                            };
                            
                            Object.keys(imgStyles).forEach(property => {
                                $img[0].style.setProperty(property, imgStyles[property], 'important');
                            });
                            
                            processedCount++;
                            
                            // Una vez procesadas todas las imágenes, hacer ajuste final
                            if (processedCount === $items.length) {
                                setTimeout(() => {
                                    self.adjustJustifiedLayout($gallery, gap);
                                }, 100);
                            }
                        };

                        // Para Safari, usar múltiples métodos para obtener dimensiones
                        if ($img[0].complete && $img[0].naturalWidth > 0) {
                            processImage();
                        } else {
                            // Crear nueva imagen para obtener dimensiones
                            const testImg = new Image();
                            testImg.onload = function() {
                                // Actualizar las dimensiones en el elemento original
                                $img.data('original-width', testImg.width);
                                $img.data('original-height', testImg.height);
                                processImage();
                            };
                            testImg.onerror = function() {
                                // Si falla la carga, usar dimensiones por defecto
                                processImage();
                            };
                            testImg.src = $img.attr('src');
                            
                            // Timeout de seguridad específico para Safari
                            setTimeout(() => {
                                if (processedCount <= index) {
                                    processImage();
                                }
                            }, 1500);
                        }
                    });
                };
                
                // Ejecutar después de un pequeño delay para Safari
                setTimeout(processImagesForSafari, 100);
                
            } else {
                // Comportamiento original para otros navegadores
                $gallery.find('.dicm-gallery-item').each(function() {
                    const $item = $(this);
                    const $img = $item.find('img');

                    const processImage = function() {
                        const tempImg = new Image();
                        tempImg.onload = function() {
                            const aspectRatio = tempImg.width / tempImg.height;
                            const calculatedWidth = Math.round(imageHeight * aspectRatio);
                            
                            requestAnimationFrame(() => {
                                $item.css({
                                    'flex-basis': `${calculatedWidth}px !important`,
                                    'max-width': `${calculatedWidth}px !important`,
                                    'height': `${imageHeight}px !important`
                                });

                                $img.css({
                                    'width': '100% !important',
                                    'height': '100% !important',
                                    'object-fit': 'cover !important',
                                    'object-position': 'center !important'
                                });
                            });
                        };
                        tempImg.src = $img.attr('src');
                    };

                    // Use requestAnimationFrame for better performance
                    requestAnimationFrame(processImage);
                });

                // Apply container styles
                $gallery.css({
                    'display': 'flex !important',
                    'flex-wrap': 'wrap !important',
                    'gap': `${gap}px !important`,
                    'width': '100% !important',
                    'align-items': 'stretch !important',
                    'justify-content': 'center !important'
                });
            }
        },

        // Enhanced handler for slider layout
        sliderLayoutHandler: function($gallery) {
            const self = this;
            
            // Get slider values
            const imageHeight = self.getResponsiveValue(
                $gallery, 
                'image-height', 
                300, 
                250, 
                200
            );
            
            const sliderSpeed = $gallery.data('slider-speed') || 20;
            const sliderItemWidth = $gallery.data('slider-item-width') || 200;
            const sliderSpacing = $gallery.data('slider-spacing') || 50;
            const sliderMode = $gallery.data('slider-mode') || 'proportional';
            const showNavigation = $gallery.data('show-navigation') || 'off';
            const autoSlide = $gallery.data('auto-slide') || 'on';
            
            // Navigation styling options
            const navColor = $gallery.data('navigation-color') || '#FFFFFF';
            const navBackground = $gallery.data('navigation-background') || 'rgba(0,0,0,0.5)';
            const navBorderColor = $gallery.data('navigation-border-color') || 'rgba(255,255,255,0.3)';
            const navSize = $gallery.data('navigation-size') || 40;
            const navBorderRadius = $gallery.data('navigation-border-radius') || 50;
            
            // Apply styles to main container
            $gallery.css({
                'width': '100% !important',
                'overflow': 'hidden !important',
                'position': 'relative !important' // Always ensure relative positioning
            });
            
            // Apply styles to slider track
            if (autoSlide === 'on') {
                $gallery.find('.slider-track').css({
                    'display': 'flex !important',
                    'align-items': 'center !important',
                    'animation': `dicm_scroll ${sliderSpeed}s linear infinite !important`
                });
            } else {
                $gallery.find('.slider-track').css({
                    'display': 'flex !important',
                    'align-items': 'center !important'
                });
            }
            
            // Process each image based on selected mode
            $gallery.find('.dicm-gallery-item').each(function() {
                const $item = $(this);
                const $img = $item.find('img');
                
                // Base styles common to both modes
                $item.css({
                    'flex': '0 0 auto !important',
                    'height': `${imageHeight}px !important`,
                    'margin-right': `${sliderSpacing}px !important`,
                    'position': 'relative !important',
                    'overflow': 'hidden !important'
                });
                
                if (sliderMode === 'uniform') {
                    // Uniform mode: all images have same size
                    $item.css({
                        'width': `${sliderItemWidth}px !important`
                    });
                    
                    $img.css({
                        'width': '100% !important',
                        'height': '100% !important',
                        'object-fit': 'cover !important'
                    });
                } else {
                    // Proportional mode: maintain original proportions
                    const loadAndProcessImage = function() {
                        // Try to get dimensions from data attributes first
                        let originalWidth = parseInt($img.data('original-width'));
                        let originalHeight = parseInt($img.data('original-height'));
                        
                       // If no data or invalid, use natural image dimensions
                       if (!originalWidth || !originalHeight || isNaN(originalWidth) || isNaN(originalHeight)) {
                           if ($img[0].complete) {
                               originalWidth = $img[0].naturalWidth;
                               originalHeight = $img[0].naturalHeight;
                           } else {
                               // If image not loaded, use tempImg
                               const tempImg = new Image();
                               tempImg.onload = function() {
                                   const aspectRatio = tempImg.width / tempImg.height;
                                   const calculatedWidth = Math.round(imageHeight * aspectRatio);
                                   
                                   requestAnimationFrame(() => {
                                       $item.css({
                                           'width': `${calculatedWidth}px !important`
                                       });
                                       
                                       $img.css({
                                           'height': '100% !important',
                                           'width': 'auto !important',
                                           'object-fit': 'contain !important'
                                       });
                                   });
                               };
                               tempImg.src = $img.attr('src');
                               return; // Exit to avoid executing following code
                           }
                       }
                       
                       // Calculate proportional width based on fixed height
                       const aspectRatio = originalWidth / originalHeight;
                       const calculatedWidth = Math.round(imageHeight * aspectRatio);
                       
                       requestAnimationFrame(() => {
                           $item.css({
                               'width': `${calculatedWidth}px !important`
                           });
                           
                           $img.css({
                               'height': '100% !important',
                               'width': 'auto !important',
                               'object-fit': 'contain !important'
                           });
                       });
                   };
                   
                   // Process the image
                   loadAndProcessImage();
               }
           });
           
           // Apply styles to navigation controls if enabled
           if (showNavigation === 'on') {
               // Ensure the container has position relative
               $gallery.css('position', 'relative !important');
               
               // Navigation container
               $gallery.find('.slider-navigation').css({
                   'position': 'absolute !important',
                   'top': '0 !important',
                   'left': '0 !important',
                   'width': '100% !important',
                   'height': '100% !important',
                   'pointer-events': 'none !important',
                   'z-index': '10 !important'
               });
               
               // Common styles for navigation buttons
               $gallery.find('.slider-nav-btn').css({
                   'position': 'absolute !important',
                   'top': '50% !important',
                   'transform': 'translateY(-50%) !important',
                   'width': `${navSize}px !important`,
                   'height': `${navSize}px !important`,
                   'display': 'flex !important',
                   'align-items': 'center !important',
                   'justify-content': 'center !important',
                   'background-color': `${navBackground} !important`,
                   'border': `1px solid ${navBorderColor} !important`,
                   'border-radius': `${navBorderRadius}% !important`,
                   'cursor': 'pointer !important',
                   'pointer-events': 'auto !important',
                   'z-index': '20 !important'
               });
               
               // Navigation icons color
               $gallery.find('.slider-nav-btn svg').css({
                   'color': `${navColor} !important`,
                   'fill': `${navColor} !important`,
                   'display': 'block !important' // Ensure visibility
               });
               
               // Always position inside the slider, regardless of setting
               $gallery.find('.slider-prev').css('left', '10px !important');
               $gallery.find('.slider-next').css('right', '10px !important');
           }
           
           // Apply keyframes for animation if they don't exist
           if (!$('#dicm-slider-keyframes').length) {
               $('head').append(`
                   <style id="dicm-slider-keyframes">
                       @keyframes dicm_scroll {
                           0% { transform: translateX(0); }
                           100% { transform: translateX(-50%); }
                       }
                   </style>
               `);
           }
       },

       updateLayout: function() {
           const self = this;
           
           $('.dicm-gallery').each(function() {
               const $gallery = $(this);
               const galleryLayout = $gallery.data('gallery-layout');

               // Get responsive values with enhanced method
               const columns = self.getResponsiveValue(
                   $gallery, 
                   'columns', 
                   3, 
                   2, 
                   1
               );

               const gap = self.getResponsiveValue(
                   $gallery, 
                   'gap', 
                   15, 
                   12, 
                   10
               );

               const imageHeight = self.getResponsiveValue(
                   $gallery, 
                   'image-height', 
                   300, 
                   250, 
                   200
               );

               // Get all responsive values explicitly
               const columns_tablet = $gallery.data('columns-tablet') || 2;
               const columns_phone = $gallery.data('columns-phone') || 1;
               const gap_tablet = $gallery.data('gap-tablet') || 12;
               const gap_phone = $gallery.data('gap-phone') || 10;
               const image_height_tablet = $gallery.data('image-height-tablet') || 250;
               const image_height_phone = $gallery.data('image-height-phone') || 200;

               // Apply layout-specific styles
               switch (galleryLayout) {
                   case 'grid':
                       $gallery.css({
                           'display': 'grid !important',
                           'grid-template-columns': `repeat(${columns}, 1fr) !important`,
                           'gap': `${gap}px !important`,
                           'width': '100% !important'
                       });

                       $gallery.find('.dicm-gallery-item').css({
                           'height': `${imageHeight}px !important`,
                           'aspect-ratio': $gallery.data('aspect-ratio') || '3/4'
                       });
                       
                       // Apply object-position for portrait images
                       $gallery.find('.dicm-gallery-item img').each(function() {
                           const $img = $(this);
                           
                           // Set basic styles first
                           $img.css({
                               'width': '100% !important',
                               'height': '100% !important',
                               'object-fit': 'cover !important'
                           });
                           
                           // Check if image is already loaded
                           if ($img[0].complete) {
                               if ($img[0].naturalHeight > $img[0].naturalWidth) {
                                   $img.css('object-position', '50% 20% !important');
                               }
                           } else {
                               // If not loaded, wait for load event
                               $img.on('load', function() {
                                   if ($img[0].naturalHeight > $img[0].naturalWidth) {
                                       $img.css('object-position', '50% 20% !important');
                                   }
                               });
                           }
                       });
                       break;

                   case 'masonry':
                       $gallery.css({
                           'column-count': `${columns} !important`,
                           'column-gap': `${gap}px !important`,
                           'width': '100% !important',
                           'display': 'block !important'
                       });

                       $gallery.find('.dicm-gallery-item').css({
                           'width': '100% !important',
                           'margin-bottom': `${gap}px !important`,
                           'break-inside': 'avoid !important',
                          'display': 'block !important'
                      });
                      break;

                  case 'justified':
                      self.justifiedLayoutHandler($gallery);
                      break;
                      
                  case 'slider':
                      self.sliderLayoutHandler($gallery);
                      break;
              }

              // Set CSS variables for consistency
              const cssVars = {
                  '--columns': columns,
                  '--columns-tablet': columns_tablet,
                  '--columns-phone': columns_phone,
                  '--gap': `${gap}px`,
                  '--gap-tablet': `${gap_tablet}px`,
                  '--gap-phone': `${gap_phone}px`,
                  '--image-height': `${imageHeight}px`,
                  '--image-height-tablet': `${image_height_tablet}px`,
                  '--image-height-phone': `${image_height_phone}px`
              };
              
              $gallery.css(cssVars);

              // Force inline styles for better compatibility
              if (galleryLayout === 'grid') {
                  // Apply specific styles for different breakpoints
                  const currentWidth = window.innerWidth;
                  
                  // Apply correctly based on mode
                  const isVisualBuilder = $('body').hasClass('et-fb');
                  if (isVisualBuilder) {
                      if ($('.et-fb-preview--phone').length || $('body').hasClass('et-fb-preview-phone')) {
                          $gallery.css('grid-template-columns', `repeat(${columns_phone}, 1fr) !important`);
                      } else if ($('.et-fb-preview--tablet').length || $('body').hasClass('et-fb-preview-tablet')) {
                          $gallery.css('grid-template-columns', `repeat(${columns_tablet}, 1fr) !important`);
                      }
                  } else {
                      // Normal behavior for frontend
                      if (currentWidth <= 767) {
                          // Mobile
                          $gallery.css('grid-template-columns', `repeat(${columns_phone}, 1fr) !important`);
                      } else if (currentWidth <= 980) {
                          // Tablet
                          $gallery.css('grid-template-columns', `repeat(${columns_tablet}, 1fr) !important`);
                      }
                  }
              }
          });

          // Special handling for Visual Builder
          if ($('body').hasClass('et-fb')) {
              setTimeout(() => {
                  $('.dicm-gallery').each(function() {
                      const $gallery = $(this);
                      const galleryLayout = $gallery.data('gallery-layout');
                      
                      // Detect current Visual Builder mode
                      let currentColumns, currentGap, currentHeight;
                      
                      if ($('.et-fb-preview--phone').length || $('body').hasClass('et-fb-preview-phone')) {
                          currentColumns = $gallery.data('columns-phone') || 1;
                          currentGap = $gallery.data('gap-phone') || 10;
                          currentHeight = $gallery.data('image-height-phone') || 200;
                          
                          // Add class to identify mode
                          $gallery.removeClass('vb-desktop vb-tablet').addClass('vb-phone');
                      } else if ($('.et-fb-preview--tablet').length || $('body').hasClass('et-fb-preview-tablet')) {
                          currentColumns = $gallery.data('columns-tablet') || 2;
                          currentGap = $gallery.data('gap-tablet') || 12;
                          currentHeight = $gallery.data('image-height-tablet') || 250;
                          
                          // Add class to identify mode
                          $gallery.removeClass('vb-desktop vb-phone').addClass('vb-tablet');
                      } else {
                          currentColumns = $gallery.data('columns') || 3;
                          currentGap = $gallery.data('gap') || 15;
                          currentHeight = $gallery.data('image-height') || 300;
                          
                          // Add class to identify mode
                          $gallery.removeClass('vb-tablet vb-phone').addClass('vb-desktop');
                      }
                      
                      // Force reapply specific styles for each layout
                      if (galleryLayout === 'grid') {
                          $gallery.css({
                              'display': 'grid !important',
                              'grid-template-columns': `repeat(${currentColumns}, 1fr) !important`,
                              'gap': `${currentGap}px !important`
                          });
                          
                          $gallery.find('.dicm-gallery-item').css({
                              'height': `${currentHeight}px !important`
                          });
                          
                          // Apply styles to portrait images in Visual Builder
                          $gallery.find('.dicm-gallery-item img').each(function() {
                              const $img = $(this);
                              
                              // Apply basic styles first
                              $img.css({
                                  'width': '100% !important',
                                  'height': '100% !important',
                                  'object-fit': 'cover !important'
                              });
                              
                              // Check if portrait and apply specific object-position
                              if ($img[0].complete) {
                                  if ($img[0].naturalHeight > $img[0].naturalWidth) {
                                      // Force object-position by completely overriding
                                      $img.attr('style', $img.attr('style') + '; object-position: 50% 20% !important');
                                  }
                              } else {
                                  $img.on('load', function() {
                                      if ($img[0].naturalHeight > $img[0].naturalWidth) {
                                          $img.attr('style', $img.attr('style') + '; object-position: 50% 20% !important');
                                      }
                                  });
                              }
                          });
                      } else if (galleryLayout === 'masonry') {
                          $gallery.css({
                              'display': 'block !important',
                              'column-count': `${currentColumns} !important`,
                              'column-gap': `${currentGap}px !important`
                          });
                      } else if (galleryLayout === 'justified') {
                          // Para el modo justified en Visual Builder, usar el handler mejorado
                          self.justifiedLayoutHandler($gallery);
                      } else if (galleryLayout === 'slider') {
                          // Handle slider in Visual Builder
                          const sliderSpeed = $gallery.data('slider-speed') || 20;
                          const sliderItemWidth = $gallery.data('slider-item-width') || 200;
                          const sliderSpacing = $gallery.data('slider-spacing') || 50;
                          const sliderMode = $gallery.data('slider-mode') || 'proportional';
                          const showNavigation = $gallery.data('show-navigation') || 'off';
                          const autoSlide = $gallery.data('auto-slide') || 'on';
                          const navigationPosition = $gallery.data('navigation-position') || 'inside';
                          
                          // Navigation options
                          const navColor = $gallery.data('navigation-color') || '#FFFFFF';
                          const navBackground = $gallery.data('navigation-background') || 'rgba(0,0,0,0.5)';
                          const navBorderColor = $gallery.data('navigation-border-color') || 'rgba(255,255,255,0.3)';
                          const navSize = $gallery.data('navigation-size') || 40;
                          const navBorderRadius = $gallery.data('navigation-border-radius') || 50;
                          
                          $gallery.css({
                              'width': '100% !important',
                              'overflow': 'hidden !important',
                              'position': 'relative !important'
                          });
                          
                          // Track styles based on auto-slide setting
                          if (autoSlide === 'on') {
                              $gallery.find('.slider-track').css({
                                  'display': 'flex !important',
                                  'align-items': 'center !important',
                                  'animation': `dicm_scroll ${sliderSpeed}s linear infinite !important`
                              });
                          } else {
                              $gallery.find('.slider-track').css({
                                  'display': 'flex !important',
                                  'align-items': 'center !important',
                                  'animation': 'none !important'
                              });
                          }
                          
                          // Apply different styles based on slider mode
                          if (sliderMode === 'uniform') {
                              $gallery.find('.dicm-gallery-item').css({
                                  'flex': '0 0 auto !important',
                                  'width': `${sliderItemWidth}px !important`,
                                  'height': `${currentHeight}px !important`,
                                  'margin-right': `${sliderSpacing}px !important`
                              });
                              
                              $gallery.find('.dicm-gallery-item img').css({
                                  'width': '100% !important',
                                  'height': '100% !important',
                                  'object-fit': 'cover !important'
                              });
                          } else {
                              // In proportional mode, process each image individually
                              $gallery.find('.dicm-gallery-item').each(function() {
                                  const $item = $(this);
                                  const $img = $item.find('img');
                                  
                                  // Set fixed height for all items
                                  $item.css({
                                      'flex': '0 0 auto !important',
                                      'height': `${currentHeight}px !important`,
                                      'margin-right': `${sliderSpacing}px !important`
                                  });
                                  
                                  // Calculate proportional width if possible
                                  if ($img[0].complete) {
                                      const aspectRatio = $img[0].naturalWidth / $img[0].naturalHeight;
                                      const calculatedWidth = Math.round(currentHeight * aspectRatio);
                                      
                                      $item.css('width', `${calculatedWidth}px !important`);
                                      
                                      $img.css({
                                          'height': '100% !important',
                                          'width': 'auto !important',
                                          'object-fit': 'contain !important'
                                      });
                                  } else {
                                      $img.on('load', function() {
                                          const aspectRatio = $img[0].naturalWidth / $img[0].naturalHeight;
                                          const calculatedWidth = Math.round(currentHeight * aspectRatio);
                                          
                                          $item.css('width', `${calculatedWidth}px !important`);
                                          
                                          $img.css({
                                              'height': '100% !important',
                                              'width': 'auto !important',
                                              'object-fit': 'contain !important'
                                          });
                                      });
                                  }
                              });
                          }
                          
                          // Apply styles to navigation controls if enabled
                          if (showNavigation === 'on') {
                              if (navigationPosition === 'bottom') {
                                  // Para navegación inferior en Visual Builder
                                  const $navigation = $gallery.next('.slider-navigation');
                                  
                                  if ($navigation.length) {
                                      $navigation.css({
                                          'position': 'relative !important',
                                          'top': 'auto !important',
                                          'left': 'auto !important',
                                          'width': 'auto !important',
                                          'height': 'auto !important',
                                          'display': 'flex !important',
                                          'justify-content': 'center !important',
                                          'align-items': 'center !important',
                                          'gap': '15px !important',
                                          'margin-top': '20px !important',
                                          'pointer-events': 'auto !important',
                                          'z-index': '10 !important'
                                      });
                                      
                                      $navigation.find('.slider-nav-btn').css({
                                          'position': 'relative !important',
                                          'top': 'auto !important',
                                          'left': 'auto !important',
                                          'right': 'auto !important',
                                          'transform': 'none !important',
                                          'margin': '0 !important',
                                          'width': `${navSize}px !important`,
                                          'height': `${navSize}px !important`,
                                          'display': 'flex !important',
                                          'align-items': 'center !important',
                                          'justify-content': 'center !important',
                                          'background-color': `${navBackground} !important`,
                                          'border': `1px solid ${navBorderColor} !important`,
                                          'border-radius': `${navBorderRadius}% !important`,
                                          'cursor': 'pointer !important',
                                          'pointer-events': 'auto !important',
                                          'z-index': '20 !important'
                                      });
                                      
                                      $navigation.find('.slider-nav-btn svg').css({
                                          'color': `${navColor} !important`,
                                          'fill': `${navColor} !important`,
                                          'display': 'block !important'
                                      });
                                  }
                              } else {
                                  // Para navegación inside/outside en Visual Builder
                                  // Ensure the container has position relative
                                  $gallery.css('position', 'relative !important');
                                  
                                  $gallery.find('.slider-navigation').css({
                                      'position': 'absolute !important',
                                      'top': '0 !important',
                                      'left': '0 !important',
                                      'width': '100% !important',
                                      'height': '100% !important',
                                      'pointer-events': 'none !important',
                                      'z-index': '10 !important'
                                  });
                                  
                                  $gallery.find('.slider-nav-btn').css({
                                      'position': 'absolute !important',
                                      'top': '50% !important',
                                      'transform': 'translateY(-50%) !important',
                                      'width': `${navSize}px !important`,
                                      'height': `${navSize}px !important`,
                                      'display': 'flex !important',
                                      'align-items': 'center !important',
                                      'justify-content': 'center !important',
                                      'background-color': `${navBackground} !important`,
                                      'border': `1px solid ${navBorderColor} !important`,
                                      'border-radius': `${navBorderRadius}% !important`,
                                      'cursor': 'pointer !important',
                                      'pointer-events': 'auto !important',
                                      'z-index': '20 !important'
                                  });
                                  
                                  $gallery.find('.slider-nav-btn svg').css({
                                      'color': `${navColor} !important`,
                                      'fill': `${navColor} !important`,
                                      'display': 'block !important'
                                  });
                                  
                                  // Position based on setting
                                  if (navigationPosition === 'outside') {
                                      $gallery.find('.slider-prev').css('left', '-60px !important');
                                      $gallery.find('.slider-next').css('right', '-60px !important');
                                  } else {
                                      // inside position
                                      $gallery.find('.slider-prev').css('left', '10px !important');
                                      $gallery.find('.slider-next').css('right', '10px !important');
                                  }
                              }
                          }
                      }
                  });
              }, 100);
          }
          
          // Fix the navigation position after layout updates
          self.fixSliderNavigationPosition();
          
          // Additional call to ensure styles are applied and infinite scroll
          setTimeout(function() {
              self.applyPortraitStyles();
              self.ensureInfiniteScroll();
          }, 500);
      },

      initLightbox: function() {
          const self = this;
          $('.dicm-gallery').each(function() {
              const $gallery = $(this);
              const enableLightbox = $gallery.data('enable-lightbox');

              if (enableLightbox === 'on') {
                  $gallery.find('.dicm-gallery-item').css('cursor', 'pointer');
                  
                  $gallery.find('.dicm-gallery-item').on('click', function(e) {
                      e.preventDefault();
                      const index = $(this).index();
                      
                      // Trigger a custom event for external lightbox
                      $(document).trigger('divi-gallery-lightbox-open', [{
                          gallery: $gallery,
                          index: index
                      }]);
                  });
              }
          });
      },

      bindEvents: function() {
          const self = this;
          
          // Resize and orientation change events
          $(window).on('resize orientationchange', function() {
              clearTimeout(self.resizeTimer);
              self.resizeTimer = setTimeout(function() {
                  self.updateLayout();
                  self.ensureInfiniteScroll();
                  self.fixSliderNavigationPosition();
              }, 250);
          });

          // Divi Builder specific events
          if (window.ET_Builder) {
              $(window).on('et_builder_api_ready', function(event, API) {
                  API.subscribe('ET_Builder.Module.Render.After', function(context) {
                      if (context.type === 'dicm_image_gallery') {
                          self.updateLayout();
                          self.initSliders(); // Initialize sliders after rendering
                          self.ensureInfiniteScroll();
                          self.fixSliderNavigationPosition();
                      }
                  });

                  // Module settings changes
                  API.subscribe('ET_Builder.Module.Settings.Change', function(settings) {
                      if (settings.module_type === 'dicm_image_gallery') {
                          setTimeout(function() {
                              self.updateLayout();
                              self.initSliders(); // Reinitialize sliders after changing configuration
                              self.ensureInfiniteScroll();
                              self.fixSliderNavigationPosition();
                          }, 100);
                      }
                  });
                  
                  // Subscribe to changes in Visual Builder state
                  if (typeof API.subscribe === 'function') {
                      API.subscribe('ET_Builder.API.State.Change', function(state) {
                          if (state && state.hasOwnProperty('responsive_mode')) {
                              setTimeout(function() {
                                  self.updateLayout();
                                  self.ensureInfiniteScroll();
                                  self.fixSliderNavigationPosition();
                              }, 100);
                          }
                      });
                  }
              });
              
              // Detect view changes in Visual Builder with click events
              if ($('body').hasClass('et-fb')) {
                  $(document).on('click', '.et-fb-preview--desktop, .et-fb-preview--tablet, .et-fb-preview--phone', function() {
                      setTimeout(function() {
                          self.updateLayout();
                          self.ensureInfiniteScroll();
                          self.fixSliderNavigationPosition();
                      }, 100);
                  });
              }
          }

// Registrar las fuentes de Adobe con Divi - VERSION MEJORADA
(function() {
    if (typeof DICM_Data !== 'undefined' && DICM_Data.adobe_fonts) {
        // Para el Visual Builder
        if (typeof window.ET_Builder !== 'undefined') {
            window.ET_Builder.API.ready(function() {
                Object.keys(DICM_Data.adobe_fonts).forEach(function(fontKey) {
                    var font = DICM_Data.adobe_fonts[fontKey];
                    
                    // Registrar con diferentes sistemas de Divi
                    if (window.et_builder_fonts) {
                        window.et_builder_fonts[fontKey] = font.name;
                    }
                    
                    if (window.et_pb_custom_fonts) {
                        window.et_pb_custom_fonts[fontKey] = font.name;
                    }
                    
                    // Para ETBuilderBackend si existe
                    if (typeof ETBuilderBackend !== 'undefined') {
                        ETBuilderBackend.fonts = ETBuilderBackend.fonts || {};
                        ETBuilderBackend.fonts[fontKey] = {
                            name: font.name,
                            family: font.family,
                            weights: font.weights,
                            styles: font.styles
                        };
                    }
                });
            });
        }
        
        // Asegurar que las fuentes estén disponibles globalmente
        window.et_pb_custom_fonts = window.et_pb_custom_fonts || {};
        Object.keys(DICM_Data.adobe_fonts).forEach(function(fontKey) {
            window.et_pb_custom_fonts[fontKey] = DICM_Data.adobe_fonts[fontKey].name;
        });
    }
})();
          
          // MutationObserver to detect DOM changes that might affect the gallery
          if (window.MutationObserver) {
              const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                      if (mutation.type === 'childList' || mutation.type === 'attributes') {
                          const $affected = $(mutation.target).closest('.dicm-gallery');
                          if ($affected.length) {
                              clearTimeout(self.resizeTimer);
                              self.resizeTimer = setTimeout(function() {
                                  self.updateLayout();
                                  self.ensureInfiniteScroll();
                                  self.fixSliderNavigationPosition();
                              }, 100);
                          }
                          
                          // Detect class changes related to responsive views
                          if (mutation.attributeName === 'class' && 
                              ($(mutation.target).hasClass('et-fb-preview--desktop') || 
                               $(mutation.target).hasClass('et-fb-preview--tablet') || 
                               $(mutation.target).hasClass('et-fb-preview--phone') ||
                               $(mutation.target).hasClass('et-fb-preview-tablet') ||
                               $(mutation.target).hasClass('et-fb-preview-phone') ||
                               $(mutation.target).hasClass('et-fb-preview-desktop'))) {
                              
                              clearTimeout(self.resizeTimer);
                              self.resizeTimer = setTimeout(function() {
                                  self.updateLayout();
                                  self.ensureInfiniteScroll();
                                  self.fixSliderNavigationPosition();
                              }, 100);
                          }
                      }
                  });
              });

              // Configure observer
              observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['class', 'style', 'data-*']
              });
          }
      }
  };

  // Initialize the gallery handler
  DiviGalleryHandler.init();

  // Make it available globally
  window.DiviGalleryHandler = DiviGalleryHandler;
});
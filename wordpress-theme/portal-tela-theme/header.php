<?php
/**
 * The header for our theme
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>

<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?php bloginfo('description'); ?>">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
    <?php wp_body_open(); ?>

    <!-- Header -->
    <header class="site-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col col-md-6">
                    <div class="site-branding">
                        <h1 class="site-title">
                            <a href="<?php echo esc_url(home_url('/')); ?>" rel="home">
                                <?php bloginfo('name'); ?>
                            </a>
                        </h1>
                        <p class="site-description">
                            <?php bloginfo('description'); ?>
                        </p>
                    </div>
                </div>
                <div class="col col-md-6">
                    <!-- Primary Navigation -->
                    <nav class="navbar navbar-expand-lg navbar-dark">
                        <?php
                        wp_nav_menu(array(
                            'theme_location' => 'primary',
                            'container' => false,
                            'menu_class' => 'navbar-nav ms-auto',
                            'depth' => 2,
                            'fallback_cb' => 'portal_tela_primary_menu_fallback',
                            'walker' => new Portal_Tela_Menu_Walker(),
                        ));
                        ?>
                    </nav>
                </div>
            </div>
        </div>
    </header>

    <!-- Skip to main content link (accessibility) -->
    <a href="#main" class="skip-link sr-only">
        <?php _e('Skip to main content', 'portal-tela-theme'); ?>
    </a>

    <!-- Main content -->
    <main id="main" class="site-main">

        <?php
        /**
         * Custom menu walker for Bootstrap navbar
         */
        class Portal_Tela_Menu_Walker extends Walker_Nav_Menu
        {
            public function start_lvl(&$output, $depth = 0, $args = null)
            {
                $output .= "\n<ul class=\"dropdown-menu\">\n";
            }

            public function start_el(&$output, $data_object, $depth = 0, $args = null, $id = 0)
            {
                $indent = ($depth) ? str_repeat("\t", $depth) : '';

                $output .= $indent . '<li class="nav-item';

                if (isset($data_object->classes) && in_array('current-menu-item', $data_object->classes)) {
                    $output .= ' active';
                }

                if (isset($args->walker->has_children) && $args->walker->has_children) {
                    $output .= ' dropdown';
                }

                $output .= '">';

                $atts = array();
                $atts['href'] = !empty($data_object->url) ? $data_object->url : '';

                $atts = apply_filters('nav_menu_link_attributes', $atts, $data_object, $depth, $args);

                $attributes = '';
                foreach ($atts as $attr => $value) {
                    if (!empty($value)) {
                        $value = ('href' === $attr) ? esc_url($value) : esc_attr($value);
                        $attributes .= ' ' . $attr . '="' . $value . '"';
                    }
                }

                $title = apply_filters('nav_menu_item_title', $data_object->title, $data_object, $args, $depth);
                $title = apply_filters('nav_menu_link_title', $title, $data_object, $args, $depth);

                $output .= '<a class="nav-link';

                if (isset($args->walker->has_children) && $args->walker->has_children) {
                    $output .= ' dropdown-toggle';
                    $attributes .= ' data-bs-toggle="dropdown" role="button" aria-expanded="false"';
                }

                $output .= '"' . $attributes . '>';
                $output .= $title;
                $output .= '</a>';
            }
        }

        /**
         * Fallback menu for when theme location is not set
         */
        function portal_tela_primary_menu_fallback()
        {
            echo '<ul class="navbar-nav ms-auto">';
            echo '<li class="nav-item"><a class="nav-link" href="' . esc_url(home_url('/')) . '">' . __('Home', 'portal-tela-theme') . '</a></li>';
            echo '<li class="nav-item"><a class="nav-link" href="' . esc_url(home_url('/blog/')) . '">' . __('Blog', 'portal-tela-theme') . '</a></li>';
            echo '</ul>';
        }
        ?>

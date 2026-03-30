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
                <div class="col-12 col-md-6">
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
                <div class="col-12 col-md-6">
                    <nav class="navbar navbar-expand-md portal-nav" aria-label="<?php esc_attr_e('Navegação principal', 'portal-tela-theme'); ?>">
                        <ul class="navbar-nav ms-auto">
                            <li class="nav-item">
                                <a class="nav-link <?php echo (is_front_page() || is_home()) ? 'active' : ''; ?>" href="<?php echo esc_url(home_url('/')); ?>">
                                    <?php esc_html_e('Início', 'portal-tela-theme'); ?>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="<?php echo esc_url(home_url('/#pipeline')); ?>">
                                    <?php esc_html_e('Pipeline IA', 'portal-tela-theme'); ?>
                                </a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    </header>
    
    <!-- Main content -->
    <main id="main" class="site-main">

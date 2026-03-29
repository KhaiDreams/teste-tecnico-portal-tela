<?php
/**
 * The footer for our theme
 */
?>

    </main><!-- #main -->

    <!-- Footer -->
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <!-- Footer Widget 1: About -->
                <div class="footer-widget">
                    <h3><?php _e('Sobre Portal Tela', 'portal-tela-theme'); ?></h3>
                    <p>
                        <?php
                        $footer_about = get_theme_mod('portal_tela_footer_about',
                            'Portal Tela é uma plataforma de conteúdo gerado por IA, trazendo artigos de alta qualidade sobre tecnologia e inovação.'
                        );
                        echo wp_kses_post($footer_about);
                        ?>
                    </p>
                </div>

                <!-- Footer Widget 2: Recent Posts -->
                <div class="footer-widget">
                    <h3><?php _e('Posts Recentes', 'portal-tela-theme'); ?></h3>
                    <ul>
                        <?php
                        $recent_posts = get_posts(array(
                            'posts_per_page' => 5,
                            'post_status' => 'publish',
                        ));

                        foreach ($recent_posts as $post) :
                            setup_postdata($post);
                        ?>
                            <li>
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </li>
                        <?php
                        endforeach;
                        wp_reset_postdata();
                        ?>
                    </ul>
                </div>

                <!-- Footer Widget 3: Categories -->
                <div class="footer-widget">
                    <h3><?php _e('Categorias', 'portal-tela-theme'); ?></h3>
                    <ul>
                        <?php
                        $categories = get_categories(array(
                            'hide_empty' => true,
                            'number' => 5,
                        ));

                        foreach ($categories as $category) :
                        ?>
                            <li>
                                <a href="<?php echo esc_url(get_category_link($category->term_id)); ?>">
                                    <?php echo esc_html($category->name); ?>
                                </a>
                            </li>
                        <?php
                        endforeach;
                        ?>
                    </ul>
                </div>

                <!-- Footer Widget 4: Custom -->
                <?php
                if (is_active_sidebar('footer-widgets')) {
                    dynamic_sidebar('footer-widgets');
                }
                ?>
            </div>

            <!-- Footer Bottom -->
            <div class="footer-bottom">
                <p>
                    &copy; <?php echo date('Y'); ?> <a href="<?php echo esc_url(home_url('/')); ?>">
                        <?php bloginfo('name'); ?>
                    </a> -
                    <?php
                    printf(
                        __('Desenvolvido com %s por %s', 'portal-tela-theme'),
                        '<a href="https://wordpress.org" target="_blank">WordPress</a>',
                        '<a href="https://portaltela.com" target="_blank">Portal Tela</a>'
                    );
                    ?>
                </p>
            </div>
        </div>
    </footer><!-- .site-footer -->

    <?php wp_footer(); ?>
</body>

</html>

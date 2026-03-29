<?php
/**
 * Template for displaying a single post
 */

get_header();
?>

<div class="container-main">
    <div class="container">
        <div class="row">
            <!-- Main content -->
            <div class="col col-md-8">
                <?php
                while (have_posts()) :
                    the_post();
                ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class('single-post'); ?>>
                        <!-- Featured Image Hero Section -->
                        <?php if (has_post_thumbnail()) : ?>
                            <div class="post-hero mb-5">
                                <?php the_post_thumbnail('post-thumbnail-large', array('class' => 'post-thumbnail w-100')); ?>
                            </div>
                        <?php endif; ?>

                        <!-- Post Header -->
                        <header class="post-header mb-5">
                            <h1 class="post-title mb-3"><?php the_title(); ?></h1>

                            <!-- Excerpt if available -->
                            <?php if (has_excerpt()) : ?>
                                <p class="post-excerpt lead">
                                    <?php echo wp_kses_post(get_the_excerpt()); ?>
                                </p>
                            <?php endif; ?>

                            <!-- Post Meta -->
                            <div class="post-meta">
                                <div class="post-author">
                                    <strong><?php the_author_posts_link(); ?></strong>
                                </div>
                                <div class="post-date">
                                    <time datetime="<?php echo esc_attr(get_the_date('c')); ?>">
                                        <?php
                                        echo esc_html(
                                            get_the_date(
                                                __('d \d\e M \d\e Y', 'portal-tela-theme'),
                                                get_the_ID()
                                            )
                                        );
                                        ?>
                                    </time>
                                </div>

                                <!-- Reading time estimation -->
                                <div class="post-reading-time">
                                    <span id="reading-time">Estimado leitura...</span>
                                </div>

                                <!-- Categories -->
                                <?php if (get_the_category()) : ?>
                                    <div class="post-category">
                                        <?php the_category(', '); ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </header>

                        <!-- Post Content -->
                        <div class="post-content mb-5">
                            <?php
                            the_content(
                                sprintf(
                                    wp_kses(
                                        __('Continue reading<span class="meta-nav"> "%s"</span>', 'portal-tela-theme'),
                                        array('span' => array('class' => array()))
                                    ),
                                    wp_kses_post(get_the_title())
                                )
                            );
                            ?>
                        </div>

                        <!-- Post Tags -->
                        <?php if (has_tag()) : ?>
                            <div class="post-tags">
                                <strong><?php _e('Tags:', 'portal-tela-theme'); ?></strong>
                                <div class="mt-2">
                                    <?php
                                    the_tags(
                                        '<span class="tag">',
                                        '</span> <span class="tag">',
                                        '</span>'
                                    );
                                    ?>
                                </div>
                            </div>
                        <?php endif; ?>

                        <!-- Author Bio Box -->
                        <div class="author-bio card mt-5 p-4 bg-light">
                            <div class="row align-items-center">
                                <div class="col col-md-2 text-center mb-3 mb-md-0">
                                    <?php echo wp_kses_post(get_avatar(get_the_author_meta('ID'), 100, '', '', array('class' => 'rounded-circle'))); ?>
                                </div>
                                <div class="col col-md-10">
                                    <h4 class="mb-2">
                                        <?php the_author_posts_link(); ?>
                                    </h4>
                                    <p class="text-muted mb-0">
                                        <?php echo wp_kses_post(get_the_author_meta('description')); ?>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Post Navigation -->
                        <nav class="post-navigation mt-5">
                            <?php
                            $prev = get_previous_post();
                            $next = get_next_post();

                            if ($prev) :
                                ?>
                                <div class="nav-previous">
                                    <a href="<?php echo esc_url(get_permalink($prev)); ?>" rel="prev">
                                        <div class="nav-subtitle"><?php _e('← Post Anterior', 'portal-tela-theme'); ?></div>
                                        <div class="nav-title"><?php echo esc_html($prev->post_title); ?></div>
                                    </a>
                                </div>
                                <?php
                            endif;

                            if ($next) :
                                ?>
                                <div class="nav-next">
                                    <a href="<?php echo esc_url(get_permalink($next)); ?>" rel="next">
                                        <div class="nav-subtitle"><?php _e('Próximo Post →', 'portal-tela-theme'); ?></div>
                                        <div class="nav-title"><?php echo esc_html($next->post_title); ?></div>
                                    </a>
                                </div>
                                <?php
                            endif;
                            ?>
                        </nav>

                        <!-- Comments -->
                        <div class="comments-section mt-5">
                            <?php
                            if (comments_open() || get_comments_number()) {
                                comments_template();
                            }
                            ?>
                        </div>
                    </article>

                    <!-- Estimated Reading Time Script -->
                    <script>
                        document.addEventListener('DOMContentLoaded', function () {
                            const content = document.querySelector('.post-content');
                            if (content) {
                                const wordCount = content.innerText.split(/\s+/).length;
                                const readingTime = Math.ceil(wordCount / 200); // 200 palavras por minuto
                                const readingTimeEl = document.getElementById('reading-time');

                                if (readingTimeEl) {
                                    if (readingTime < 1) {
                                        readingTimeEl.innerHTML = 'Menos de 1 minuto de leitura';
                                    } else if (readingTime === 1) {
                                        readingTimeEl.innerHTML = '1 minuto de leitura';
                                    } else {
                                        readingTimeEl.innerHTML = readingTime + ' minutos de leitura';
                                    }
                                }
                            }
                        });
                    </script>

                <?php
                endwhile;
                ?>
            </div>

            <!-- Sidebar -->
            <aside class="col col-md-4">
                <?php
                if (is_active_sidebar('primary-sidebar')) {
                    dynamic_sidebar('primary-sidebar');
                }
                ?>
            </aside>
        </div>
    </div>
</div>

<?php
get_footer();
?>

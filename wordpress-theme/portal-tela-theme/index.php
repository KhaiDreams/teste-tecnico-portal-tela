<?php
/**
 * Main template file
 *
 * Fallback template required by WordPress to activate the theme.
 */

get_header();
?>

<section id="pipeline" class="home-hero">
    <div class="container">
        <p class="hero-kicker">Portal Tela</p>
        <h1>Pipeline de conteudo com IA e publicacao automatica no WordPress</h1>
        <p class="hero-subtitle">
            O backend recebe uma URL publica, gera um artigo em portugues e publica via webhook no WordPress.
        </p>
        <div class="hero-badges">
            <span>Backend Node.js + OpenAI</span>
            <span>Plugin REST</span>
            <span>Tema Bootstrap + SASS</span>
        </div>
    </div>
</section>

<section id="ultimos-posts" class="home-posts">
    <div class="container">
        <div class="home-posts-header">
            <h2>Ultimos artigos</h2>
            <p>Posts publicados automaticamente pelo webhook do backend.</p>
        </div>

        <?php
        $latest_posts = new WP_Query(array(
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => 12,
            'ignore_sticky_posts' => true,
        ));
        ?>

        <?php if ($latest_posts->have_posts()) : ?>
            <div class="post-grid">
                <?php while ($latest_posts->have_posts()) : $latest_posts->the_post(); ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class('post-card'); ?>>
                        <a class="post-card-link" href="<?php the_permalink(); ?>">
                            <h3 class="post-card-title"><?php the_title(); ?></h3>
                            <p class="post-card-meta">
                                <?php echo esc_html(get_the_date('d/m/Y')); ?> • <?php echo esc_html(get_the_author()); ?>
                            </p>
                            <div class="post-card-excerpt">
                                <?php echo esc_html(wp_trim_words(get_the_excerpt(), 24)); ?>
                            </div>
                        </a>
                    </article>
                <?php endwhile; ?>
            </div>
            <?php wp_reset_postdata(); ?>
        <?php else : ?>
            <p>Nenhum post publicado ainda.</p>
        <?php endif; ?>
    </div>
</section>

<?php
get_footer();
?>

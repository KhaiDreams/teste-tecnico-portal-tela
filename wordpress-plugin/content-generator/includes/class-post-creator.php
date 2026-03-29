<?php

namespace ContentGenerator;

class PostCreator
{
    /**
     * Create a new WordPress post
     *
     * @param array $data Post data
     * @return int|WP_Error Post ID or WP_Error on failure
     */
    public function create_post(array $data)
    {
        // Sanitize inputs
        $post_data = array(
            'post_title' => isset($data['title']) ? sanitize_text_field($data['title']) : 'Untitled',
            'post_content' => isset($data['content']) ? wp_kses_post($data['content']) : '',
            'post_excerpt' => isset($data['excerpt']) ? sanitize_text_field($data['excerpt']) : '',
            'post_status' => isset($data['status']) && in_array($data['status'], array('publish', 'draft', 'pending'), true) ? $data['status'] : 'draft',
            'post_type' => 'post',
        );

        // Optionally set author
        if (isset($data['author_id'])) {
            $author_id = intval($data['author_id']);
            if (get_user_by('id', $author_id)) {
                $post_data['post_author'] = $author_id;
            }
        } else {
            // Use default author (usually admin)
            $post_data['post_author'] = get_current_user_id() ?: 1;
        }

        // Optionally set featured image
        if (isset($data['featured_image_url'])) {
            // We'll handle image download after post creation
        }

        // Insert the post
        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Add custom meta data
        if (isset($data['content_generator_id'])) {
            update_post_meta($post_id, '_content_generator_id', intval($data['content_generator_id']));
        }

        if (isset($data['source_url'])) {
            update_post_meta($post_id, '_content_generator_source_url', esc_url($data['source_url']));
        }

        // Add post tags or categories if provided
        if (isset($data['tags']) && is_array($data['tags'])) {
            wp_set_post_tags($post_id, $data['tags']);
        }

        if (isset($data['categories']) && is_array($data['categories'])) {
            wp_set_post_categories($post_id, $data['categories']);
        }

        // Handle featured image if provided
        if (isset($data['featured_image_url'])) {
            $this->set_featured_image($post_id, $data['featured_image_url']);
        }

        return $post_id;
    }

    /**
     * Set featured image for a post from URL
     *
     * @param int $post_id Post ID
     * @param string $image_url Image URL
     * @return int|false Attachment ID or false on failure
     */
    private function set_featured_image(int $post_id, string $image_url)
    {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $attachment_id = media_sideload_image(
            esc_url($image_url),
            $post_id,
            'Featured image for content generator',
            'id'
        );

        if (!is_wp_error($attachment_id)) {
            set_post_thumbnail($post_id, $attachment_id);
            return $attachment_id;
        }

        return false;
    }

    /**
     * Update an existing post
     *
     * @param int $post_id Post ID
     * @param array $data Updated post data
     * @return int|WP_Error Post ID or WP_Error on failure
     */
    public function update_post(int $post_id, array $data)
    {
        // Check if post exists
        if (!get_post($post_id)) {
            return new \WP_Error('post_not_found', 'Post does not exist');
        }

        $post_data = array('ID' => $post_id);

        if (isset($data['title'])) {
            $post_data['post_title'] = sanitize_text_field($data['title']);
        }

        if (isset($data['content'])) {
            $post_data['post_content'] = wp_kses_post($data['content']);
        }

        if (isset($data['excerpt'])) {
            $post_data['post_excerpt'] = sanitize_text_field($data['excerpt']);
        }

        if (isset($data['status'])) {
            $post_data['post_status'] = $data['status'];
        }

        return wp_update_post($post_data, true);
    }
}

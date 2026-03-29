<?php

namespace ContentGenerator;

class Webhook
{
    public static function register_routes()
    {
        register_rest_route(
            'content-generator/v1',
            '/receive-post',
            array(
                'methods' => 'POST',
                'callback' => array(__CLASS__, 'handle_webhook'),
                'permission_callback' => array(__CLASS__, 'verify_request'),
            )
        );

        register_rest_route(
            'content-generator/v1',
            '/health',
            array(
                'methods' => 'GET',
                'callback' => array(__CLASS__, 'health_check'),
                'permission_callback' => '__return_true',
            )
        );
    }

    public static function health_check()
    {
        return new \WP_REST_Response(
            array(
                'success' => true,
                'data' => array(
                    'status' => 'ok',
                    'timestamp' => current_time('c'),
                    'wordpress_version' => get_bloginfo('version'),
                ),
            ),
            200
        );
    }

    public static function verify_request(\WP_REST_Request $request)
    {
        $secret = get_option('content_generator_webhook_secret');
        $provided_secret = $request->get_header('X-Webhook-Secret');

        if (!$provided_secret || $provided_secret !== $secret) {
            return false;
        }

        return true;
    }

    public static function handle_webhook(\WP_REST_Request $request)
    {
        try {
            // Get the JSON payload
            $params = $request->get_json_params();

            // Validate the payload
            $validator = new Validator();
            $validation_result = $validator->validate_payload($params);

            if (!$validation_result['valid']) {
                return new \WP_REST_Response(
                    array(
                        'success' => false,
                        'error' => $validation_result['error'],
                    ),
                    400
                );
            }

            // Create the post
            $post_creator = new PostCreator();
            $post_id = $post_creator->create_post($params);

            if (is_wp_error($post_id)) {
                return new \WP_REST_Response(
                    array(
                        'success' => false,
                        'error' => 'Failed to create post: ' . $post_id->get_error_message(),
                    ),
                    500
                );
            }

            // Log the action
            do_action('content_generator_post_created', $post_id, $params);

            return new \WP_REST_Response(
                array(
                    'success' => true,
                    'post_id' => $post_id,
                    'message' => sprintf('Post %d created successfully', $post_id),
                    'timestamp' => current_time('c'),
                ),
                201
            );
        } catch (\Exception $e) {
            return new \WP_REST_Response(
                array(
                    'success' => false,
                    'error' => 'Server error: ' . $e->getMessage(),
                ),
                500
            );
        }
    }
}

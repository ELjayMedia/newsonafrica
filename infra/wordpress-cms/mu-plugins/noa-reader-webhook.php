<?php
/**
 * Plugin Name: NOA reader webhook
 * Description: Tells the News On Africa reader (app.newsonafrica.com) when a story is published, updated or deleted, so it refreshes its cache and the Supabase content_index (NOA-88, NOA-191).
 *
 * Network-wide must-use plugin. Configuration lives in network (site) options, set with WP-CLI:
 *   wp site option update noa_reader_webhook_url    https://app.newsonafrica.com/api/webhooks/wordpress
 *   wp site option update noa_reader_webhook_secret <same value as the reader's WORDPRESS_WEBHOOK_SECRET>
 * The body is signed with HMAC-SHA256 (header x-wp-signature: sha256=<hex>), so the secret never travels.
 * Calls are non-blocking: an unreachable reader never slows down or breaks publishing.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Edition code for the current site: its subdirectory path (/sz/ -> sz), or null for the network root. */
function noa_reader_webhook_country() {
    $path = trim((string) get_blog_details(get_current_blog_id())->path, '/');
    return preg_match('/^[a-z]{2}$/', $path) ? $path : null;
}

function noa_reader_webhook_send($action, $post_id) {
    $url = get_site_option('noa_reader_webhook_url');
    $secret = get_site_option('noa_reader_webhook_secret');
    $country = noa_reader_webhook_country();
    if (!$url || !$secret || !$country) {
        return;
    }
    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'post') {
        return;
    }
    $author = get_userdata((int) $post->post_author);
    $body = wp_json_encode(array(
        'action'  => $action,
        'country' => $country,
        'post'    => array(
            'id'            => (int) $post->ID,
            'slug'          => $post->post_name,
            'categorySlugs' => wp_get_post_categories($post->ID, array('fields' => 'slugs')),
            'tagSlugs'      => wp_get_post_tags($post->ID, array('fields' => 'slugs')),
            'authorSlug'    => $author ? $author->user_nicename : null,
        ),
    ));
    wp_remote_post($url, array(
        'body'     => $body,
        'headers'  => array(
            'Content-Type'   => 'application/json',
            'x-wp-signature' => 'sha256=' . hash_hmac('sha256', $body, $secret),
        ),
        'timeout'  => 5,
        'blocking' => false,
    ));
}

// Publish, update and unpublish. Autosaves and revisions are ignored.
add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if ($post->post_type !== 'post' || wp_is_post_revision($post) || wp_is_post_autosave($post)) {
        return;
    }
    if ($new_status === 'publish') {
        noa_reader_webhook_send($old_status === 'publish' ? 'post_updated' : 'post_published', $post->ID);
    } elseif ($old_status === 'publish') {
        // Unpublished (draft, private, trash): the reader re-checks WordPress and drops it from the index.
        noa_reader_webhook_send('post_deleted', $post->ID);
    }
}, 10, 3);

add_action('before_delete_post', function ($post_id) {
    $post = get_post($post_id);
    if ($post && $post->post_type === 'post' && $post->post_status === 'publish') {
        noa_reader_webhook_send('post_deleted', $post_id);
    }
});

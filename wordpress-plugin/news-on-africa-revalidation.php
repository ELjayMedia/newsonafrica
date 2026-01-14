<?php
/**
 * Plugin Name: News On Africa - Next.js Revalidation
 * Description: Sends webhooks to Next.js for ISR cache invalidation
 * Version: 1.0.0
 * Author: EljayMedia
 */

if (!defined('ABSPATH')) {
    exit;
}

class NewsOnAfrica_Revalidation {
    private $api_url;
    private $secret;
    
    public function __construct() {
        // Configure these in wp-config.php or plugin settings
        $this->api_url = defined('NEXTJS_REVALIDATE_URL') 
            ? NEXTJS_REVALIDATE_URL 
            : get_option('noa_revalidate_url');
            
        $this->secret = defined('NEXTJS_REVALIDATE_SECRET') 
            ? NEXTJS_REVALIDATE_SECRET 
            : get_option('noa_revalidate_secret');
        
        if ($this->api_url && $this->secret) {
            $this->init_hooks();
        }
    }
    
    private function init_hooks() {
        // Post published/updated
        add_action('publish_post', [$this, 'handle_post_change'], 10, 2);
        add_action('post_updated', [$this, 'handle_post_update'], 10, 3);
        
        // Post deleted
        add_action('delete_post', [$this, 'handle_post_delete'], 10, 2);
        
        // Category/tag changes
        add_action('set_object_terms', [$this, 'handle_taxonomy_change'], 10, 6);
    }
    
    public function handle_post_change($post_id, $post) {
        if ($post->post_type !== 'post' || $post->post_status !== 'publish') {
            return;
        }
        
        $this->send_webhook('post_published', $post_id);
    }
    
    public function handle_post_update($post_id, $post_after, $post_before) {
        if ($post_after->post_type !== 'post') {
            return;
        }
        
        // Only revalidate if moving to/from published
        $status_changed = $post_before->post_status !== $post_after->post_status;
        
        if ($post_after->post_status === 'publish' || $status_changed) {
            $this->send_webhook('post_updated', $post_id);
        }
    }
    
    public function handle_post_delete($post_id, $post) {
        if ($post->post_type !== 'post') {
            return;
        }
        
        $this->send_webhook('post_deleted', $post_id);
    }
    
    public function handle_taxonomy_change($object_id, $terms, $tt_ids, $taxonomy, $append, $old_tt_ids) {
        if (get_post_type($object_id) !== 'post') {
            return;
        }
        
        // Only revalidate for categories and tags
        if (in_array($taxonomy, ['category', 'post_tag'])) {
            $this->send_webhook('taxonomy_updated', $object_id);
        }
    }
    
    private function send_webhook($event, $post_id) {
        $post = get_post($post_id);
        if (!$post) {
            return;
        }
        
        // Get edition from site (assumes multisite with site-specific editions)
        $edition = $this->get_edition_code();
        
        // Get categories
        $categories = wp_get_post_categories($post_id, ['fields' => 'slugs']);
        
        // Get tags
        $tags = wp_get_post_tags($post_id, ['fields' => 'slugs']);
        
        $payload = [
            'event' => $event,
            'edition' => $edition,
            'postId' => $post_id,
            'slug' => $post->post_name,
            'categories' => $categories,
            'tags' => $tags,
            'timestamp' => current_time('mysql')
        ];
        
        $response = wp_remote_post($this->api_url, [
            'headers' => [
                'Content-Type' => 'application/json',
                'x-revalidate-secret' => $this->secret
            ],
            'body' => json_encode($payload),
            'timeout' => 10,
            'blocking' => false // Don't block WordPress save
        ]);
        
        // Log for debugging
        if (is_wp_error($response)) {
            error_log('NOA Revalidation Error: ' . $response->get_error_message());
        }
    }
    
    private function get_edition_code() {
        // Map WordPress site to edition code
        $site_id = get_current_blog_id();
        
        $edition_map = [
            1 => 'pan', // Main site
            2 => 'sz',  // Eswatini
            3 => 'za',  // South Africa
            4 => 'ng',  // Nigeria
        ];
        
        return $edition_map[$site_id] ?? 'pan';
    }
}

// Initialize plugin
new NewsOnAfrica_Revalidation();

// Admin settings page (optional)
add_action('admin_menu', function() {
    add_options_page(
        'NOA Revalidation Settings',
        'NOA Revalidation',
        'manage_options',
        'noa-revalidation',
        'noa_revalidation_settings_page'
    );
});

function noa_revalidation_settings_page() {
    if (isset($_POST['noa_save_settings'])) {
        update_option('noa_revalidate_url', sanitize_text_field($_POST['revalidate_url']));
        update_option('noa_revalidate_secret', sanitize_text_field($_POST['revalidate_secret']));
        echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
    }
    
    $url = get_option('noa_revalidate_url', '');
    $secret = get_option('noa_revalidate_secret', '');
    ?>
    <div class="wrap">
        <h1>News On Africa - Revalidation Settings</h1>
        <form method="post">
            <table class="form-table">
                <tr>
                    <th><label for="revalidate_url">Next.js Revalidate URL</label></th>
                    <td>
                        <input type="url" id="revalidate_url" name="revalidate_url" 
                               value="<?php echo esc_attr($url); ?>" class="regular-text" 
                               placeholder="https://newsonafrica.com/api/revalidate">
                    </td>
                </tr>
                <tr>
                    <th><label for="revalidate_secret">Secret Key</label></th>
                    <td>
                        <input type="text" id="revalidate_secret" name="revalidate_secret" 
                               value="<?php echo esc_attr($secret); ?>" class="regular-text">
                        <p class="description">Must match REVALIDATION_SECRET in Next.js</p>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="noa_save_settings" class="button-primary" value="Save Settings">
            </p>
        </form>
    </div>
    <?php
}

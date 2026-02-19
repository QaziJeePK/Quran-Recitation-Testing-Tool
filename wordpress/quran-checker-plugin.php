<?php
/**
 * Plugin Name:       Quran Recitation Checker
 * Plugin URI:        https://yourdomain.com/quran-checker
 * Description:       Embed the AI-powered Quran Recitation Checker on any WordPress page using shortcode [quran_checker] or Gutenberg block.
 * Version:           1.0.0
 * Author:            Your Name
 * Author URI:        https://yourdomain.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       quran-checker
 * Domain Path:       /languages
 */

// ── Security: Abort if accessed directly ──────────────────────────────────────
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ── Plugin Constants ──────────────────────────────────────────────────────────
define( 'QRC_VERSION',     '1.0.0' );
define( 'QRC_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'QRC_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );

/**
 * SETUP INSTRUCTIONS:
 *
 * 1. Build your React app:  npm run build
 * 2. Upload the entire 'dist/' folder to your WordPress server at:
 *    /wp-content/plugins/quran-checker/app/
 *    (so you have: /wp-content/plugins/quran-checker/app/index.html)
 * 3. Upload this PHP file to:
 *    /wp-content/plugins/quran-checker/quran-checker-plugin.php
 * 4. Activate the plugin in WordPress Admin → Plugins
 * 5. Add [quran_checker] shortcode to any page or post
 * 6. OR add the Quran Checker block in the Gutenberg editor
 */

// ── App URL (path to built React app) ────────────────────────────────────────
function qrc_get_app_url() {
    return QRC_PLUGIN_URL . 'app/';
}

// ── Enqueue Scripts & Styles ──────────────────────────────────────────────────
function qrc_enqueue_assets() {
    // Only load on pages/posts that use the shortcode or block
    global $post;
    $load = false;

    if ( is_a( $post, 'WP_Post' ) ) {
        if ( has_shortcode( $post->post_content, 'quran_checker' ) ) {
            $load = true;
        }
        if ( has_block( 'quran-checker/app', $post ) ) {
            $load = true;
        }
    }

    // Always load on admin for block editor preview
    if ( is_admin() ) {
        $load = true;
    }

    if ( ! $load ) return;

    $app_url = qrc_get_app_url();

    // ── Scan the built dist/assets directory for hashed files ─────────────────
    $app_dir   = QRC_PLUGIN_DIR . 'app/assets/';
    $js_file   = '';
    $css_file  = '';

    if ( is_dir( $app_dir ) ) {
        $files = scandir( $app_dir );
        foreach ( $files as $file ) {
            if ( preg_match( '/^index-[a-zA-Z0-9]+\.js$/', $file ) ) {
                $js_file = $file;
            }
            if ( preg_match( '/^index-[a-zA-Z0-9]+\.css$/', $file ) ) {
                $css_file = $file;
            }
        }
    }

    // ── Option A: Vite standard build (separate JS + CSS) ─────────────────────
    if ( $js_file ) {
        wp_enqueue_script(
            'quran-checker-app',
            $app_url . 'assets/' . $js_file,
            array(),
            QRC_VERSION,
            true  // load in footer
        );
        // Make it a module script
        add_filter( 'script_loader_tag', function( $tag, $handle, $src ) {
            if ( 'quran-checker-app' === $handle ) {
                return '<script type="module" src="' . esc_url( $src ) . '"></script>' . "\n";
            }
            return $tag;
        }, 10, 3 );
    }

    if ( $css_file ) {
        wp_enqueue_style(
            'quran-checker-style',
            $app_url . 'assets/' . $css_file,
            array(),
            QRC_VERSION
        );
    }

    // ── Option B: vite-plugin-singlefile build (single inline HTML) ───────────
    // If using singlefile, assets are baked into index.html — no separate files needed.

    // ── Arabic Fonts ──────────────────────────────────────────────────────────
    wp_enqueue_style(
        'quran-checker-fonts',
        'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Inter:wght@400;600;700;800&display=swap',
        array(),
        null
    );
}
add_action( 'wp_enqueue_scripts', 'qrc_enqueue_assets' );
add_action( 'admin_enqueue_scripts', 'qrc_enqueue_assets' );


// ── Shortcode: [quran_checker] ────────────────────────────────────────────────
function qrc_shortcode( $atts ) {
    $atts = shortcode_atts(
        array(
            'height'    => '100vh',
            'width'     => '100%',
            'mode'      => 'embed',   // 'embed' = inline div | 'iframe' = iframe
        ),
        $atts,
        'quran_checker'
    );

    // ── Mode: iframe ──────────────────────────────────────────────────────────
    if ( 'iframe' === $atts['mode'] ) {
        $app_url = qrc_get_app_url() . 'index.html';
        return sprintf(
            '<iframe
                src="%s"
                width="%s"
                height="%s"
                style="border:none; border-radius:12px; display:block;"
                allow="microphone; autoplay"
                title="Quran Recitation Checker"
                loading="lazy"
            ></iframe>',
            esc_url( $app_url ),
            esc_attr( $atts['width'] ),
            esc_attr( $atts['height'] )
        );
    }

    // ── Mode: embed (React mounts into this div) ───────────────────────────────
    // When using standard Vite build, the React app mounts into #root.
    // We rename it to avoid conflict with WordPress theme's #root.
    ob_start();
    ?>
    <div id="quran-checker-wrapper" style="width:<?php echo esc_attr( $atts['width'] ); ?>; min-height:<?php echo esc_attr( $atts['height'] ); ?>;">
        <div id="quran-checker-root">
            <!-- React app mounts here -->
            <div style="display:flex;align-items:center;justify-content:center;min-height:200px;flex-direction:column;gap:16px;background:linear-gradient(135deg,#065f46,#0d9488);border-radius:16px;color:white;">
                <div style="font-size:3rem;">🕌</div>
                <div style="font-size:1rem;font-weight:600;">Loading Quran Checker…</div>
                <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:qrc-spin 0.7s linear infinite;"></div>
            </div>
        </div>
    </div>
    <style>
        @keyframes qrc-spin { to { transform: rotate(360deg); } }
        /* Prevent WordPress theme from interfering */
        #quran-checker-wrapper * { box-sizing: border-box; }
        #quran-checker-wrapper img { max-width: none; }
        #quran-checker-wrapper .wp-block { display: block; }
    </style>
    <script>
        // Override the React mount point ID so it doesn't conflict with WordPress #root
        document.addEventListener('DOMContentLoaded', function() {
            var el = document.getElementById('quran-checker-root');
            if (el) el.id = 'root';
        });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode( 'quran_checker', 'qrc_shortcode' );


// ── Gutenberg Block Registration ──────────────────────────────────────────────
function qrc_register_block() {
    if ( ! function_exists( 'register_block_type' ) ) return;

    register_block_type( 'quran-checker/app', array(
        'render_callback' => function( $attributes ) {
            return qrc_shortcode( $attributes );
        },
        'attributes' => array(
            'height' => array( 'type' => 'string', 'default' => '100vh' ),
            'width'  => array( 'type' => 'string', 'default' => '100%' ),
            'mode'   => array( 'type' => 'string', 'default' => 'embed' ),
        ),
        'editor_script'   => 'quran-checker-block-editor',
        'editor_style'    => 'quran-checker-block-editor-style',
    ) );
}
add_action( 'init', 'qrc_register_block' );


// ── Admin Settings Page ───────────────────────────────────────────────────────
function qrc_add_admin_menu() {
    add_options_page(
        'Quran Checker Settings',
        '🕌 Quran Checker',
        'manage_options',
        'quran-checker',
        'qrc_settings_page'
    );
}
add_action( 'admin_menu', 'qrc_add_admin_menu' );

function qrc_settings_page() {
    ?>
    <div class="wrap">
        <h1>🕌 Quran Recitation Checker – Settings</h1>

        <div style="background:#fff;padding:24px;border-radius:8px;border:1px solid #ddd;max-width:800px;margin-top:20px;">

            <h2>📋 How to Use</h2>
            <table class="widefat" style="margin-bottom:24px;">
                <tbody>
                    <tr>
                        <td style="font-weight:bold;width:200px;">Basic Shortcode</td>
                        <td><code>[quran_checker]</code></td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold;">iframe Mode</td>
                        <td><code>[quran_checker mode="iframe" height="800px"]</code></td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold;">Custom Size</td>
                        <td><code>[quran_checker width="100%" height="90vh"]</code></td>
                    </tr>
                    <tr>
                        <td style="font-weight:bold;">Gutenberg Block</td>
                        <td>Search "Quran Checker" in the block editor</td>
                    </tr>
                </tbody>
            </table>

            <h2>🚀 Setup Checklist</h2>
            <ol style="line-height:2;">
                <li>Run <code>npm run build</code> in your project folder</li>
                <li>Upload the <strong>dist/</strong> folder contents to <code>/wp-content/plugins/quran-checker/app/</code></li>
                <li>The file structure should be:
                    <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;">/wp-content/plugins/quran-checker/
├── quran-checker-plugin.php  ← this file
└── app/
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   └── index-[hash].css
    └── .htaccess</pre>
                </li>
                <li>Add <code>[quran_checker]</code> to any Page or Post</li>
                <li>Ensure your server allows the <strong>microphone</strong> permission header</li>
            </ol>

            <h2>⚙️ Microphone Permissions</h2>
            <p>Add this to your server's Apache <code>.htaccess</code> or Nginx config:</p>
            <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;">Header always set Permissions-Policy "microphone=(self)"
Header always set Feature-Policy "microphone 'self'"</pre>

            <h2>💡 AdSense Integration</h2>
            <p>To enable ads, uncomment the AdSense script in <code>app/index.html</code> and replace <code>ca-pub-XXXXXXXXXXXXXXXX</code> with your Publisher ID.</p>

            <h2>📊 App URL</h2>
            <p>Direct link to the app: <a href="<?php echo esc_url( qrc_get_app_url() . 'index.html' ); ?>" target="_blank"><?php echo esc_html( qrc_get_app_url() . 'index.html' ); ?></a></p>
        </div>
    </div>
    <?php
}


// ── Plugin Activation: check requirements ─────────────────────────────────────
function qrc_activate() {
    // Check PHP version
    if ( version_compare( PHP_VERSION, '7.4', '<' ) ) {
        deactivate_plugins( plugin_basename( __FILE__ ) );
        wp_die( 'Quran Checker requires PHP 7.4 or higher. Your server runs PHP ' . PHP_VERSION );
    }
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'qrc_activate' );

function qrc_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'qrc_deactivate' );


// ── Add "Settings" link on Plugins page ───────────────────────────────────────
function qrc_plugin_links( $links ) {
    $settings_link = '<a href="' . admin_url( 'options-general.php?page=quran-checker' ) . '">Settings</a>';
    array_unshift( $links, $settings_link );
    return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'qrc_plugin_links' );

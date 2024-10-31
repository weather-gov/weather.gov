((web-mode . (
              (web-mode-markup-indent-offset . 2)
              (web-mode-code-indent-offset . 2)
              (eval web-mode-set-engine 'django)
              (eval drupal-mode)
              (eval electric-pair-mode nil)
              (eval hl-line-mode)))
 (auto-mode-alist . (
                     ("\\.html\\'" . web-mode)
                     ("\\.html.twig\\'" . web-mode)
                     ("\\.php\\'" . web-mode)
                     ("\\.php.test\\'" . web-mode))))

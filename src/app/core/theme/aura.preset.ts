import Base from '@primeuix/themes/aura/base';
import type { ExtendedCSS } from '@primeuix/themes/types';
import css from '@primeuix/themes/aura/css';
import avatar from '@primeuix/themes/aura/avatar';
import badge from '@primeuix/themes/aura/badge';
import button from '@primeuix/themes/aura/button';
import card from '@primeuix/themes/aura/card';
import checkbox from '@primeuix/themes/aura/checkbox';
import chip from '@primeuix/themes/aura/chip';
import datatable from '@primeuix/themes/aura/datatable';
import datepicker from '@primeuix/themes/aura/datepicker';
import dialog from '@primeuix/themes/aura/dialog';
import drawer from '@primeuix/themes/aura/drawer';
import iconfield from '@primeuix/themes/aura/iconfield';
import inputnumber from '@primeuix/themes/aura/inputnumber';
import inputtext from '@primeuix/themes/aura/inputtext';
import menu from '@primeuix/themes/aura/menu';
import message from '@primeuix/themes/aura/message';
import multiselect from '@primeuix/themes/aura/multiselect';
import paginator from '@primeuix/themes/aura/paginator';
import popover from '@primeuix/themes/aura/popover';
import progressbar from '@primeuix/themes/aura/progressbar';
import radiobutton from '@primeuix/themes/aura/radiobutton';
import ripple from '@primeuix/themes/aura/ripple';
import select from '@primeuix/themes/aura/select';
import selectbutton from '@primeuix/themes/aura/selectbutton';
import skeleton from '@primeuix/themes/aura/skeleton';
import tabs from '@primeuix/themes/aura/tabs';
import tag from '@primeuix/themes/aura/tag';
import textarea from '@primeuix/themes/aura/textarea';
import togglebutton from '@primeuix/themes/aura/togglebutton';
import toolbar from '@primeuix/themes/aura/toolbar';
import tooltip from '@primeuix/themes/aura/tooltip';
import virtualscroller from '@primeuix/themes/aura/virtualscroller';

/**
 * Keep Aura's original tokens, but bundle only the components used by the portal.
 * Include internal dependencies too (e.g. table filters, select scroller, menu badge).
 * Add the matching theme here when introducing another PrimeNG component.
 */
export const AuraPreset = {
  ...Base,
  // Themes 2.0.3 exports this as default at runtime, but its declaration uses a named export.
  css: css as unknown as ExtendedCSS,
  components: {
    avatar,
    badge,
    button,
    card,
    checkbox,
    chip,
    datatable,
    datepicker,
    dialog,
    drawer,
    iconfield,
    inputnumber,
    inputtext,
    menu,
    message,
    multiselect,
    paginator,
    popover,
    progressbar,
    radiobutton,
    ripple,
    select,
    selectbutton,
    skeleton,
    tabs,
    tag,
    textarea,
    togglebutton,
    toolbar,
    tooltip,
    virtualscroller,
  },
};

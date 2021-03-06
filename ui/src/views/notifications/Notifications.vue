<template lang="pug">
div
  BackToTop
  Navbar(:name="$t('notifications')")
  BreadcrumbFilter(
    :active="true",
    dataType="notifications",
    :showAllRemove="notifications.length !== 0 && checkLevel('notifications:edit')", 
    :showFilterCameras="true",
    :showFilterDate="true",
    :showFilterLabelsFor="'notifications'",
    :showFilterRooms="true",
    :showFilterTypes="true", 
    @filter="filterNotifications",
    @remove-all="removeAll"
  )
  main.inner-container.w-100.h-100vh-calc-filter.pt-save.footer-offset
    .container.pt-3.d-flex.flex-wrap.justify-content-center.align-content-center.position-absolute-fullsize(v-if="loading")
      b-spinner.text-color-primary
    .container.pt-3(v-else)
      .overflow-show(v-for="(notification, i) in notifications" :key="notification.id" :data-id="notification.id" data-aos="fade-up" data-aos-duration="1000")
        swipe-list(ref="list", 
            :items="[notification]", 
            item-key="id", 
            @active="startSwipe($event)",
            @closed="closed($event)",
            @rightRevealed="rightRevealed($event)"
          )
          template(v-slot="{ revealLeft, revealRight, close }")
            b-link.card(v-if="notification.recordStoring" @click="index = i")
              .col-10.p-0.flex-wrap.justify-content-start.align-content-center
                .card-title {{ notification.camera }}
                .card-text 
                  b {{ $t("label") }}: 
                  | {{ notification.label.toString() }}
                .card-text
                  b {{ $t("motion") }}: 
                  | {{ notification.time }}
              .col-2.p-0.d-flex.flex-wrap.justify-content-end.align-content-center
                b-card-img-lazy.notification-card.object-fit(@error.native="handleErrorImg" :src="'/files/' + (notification.recordType === 'Video' ? `${notification.name}@2.jpeg` : notification.fileName)" :img-alt="notification.name"  right height=40 width=40 blank-height=40 blank-width=40)
            .card(v-else)
              .col-10.p-0.flex-wrap.justify-content-start.align-content-center
                .card-title {{ notification.camera }}
                .card-text 
                  b {{ $t("label") }}: 
                  | {{ notification.label.toString() }}
                .card-text
                  b {{ $t("motion") }}: 
                  | {{ notification.time }}
          template(v-if="checkLevel('notifications:edit')" v-slot:right)
            .swipeout-action(title="remove")
              .swipe-remove.d-flex.flex-wrap.justify-content-center.align-content-center(:data-remove-id="notification.id")
                b-icon.text-color-danger.cursor-pointer(icon="trash-fill", aria-hidden="true", @click="remove(notification, i, $event)")
      CoolLightBox(
        :items="images" 
        :index="index"
        @close="index = null",
        :closeOnClickOutsideMobile="true",
        :useZoomBar="true"
      )
      div(data-aos="fade-up" data-aos-duration="1000")
        infinite-loading(:identifier="infiniteId", @infinite="infiniteHandler")
          div(slot="spinner")
            b-spinner.text-color-primary
          div(slot="no-more") {{ $t("no_more_data") }}
          div(slot="no-results") {{ $t("no_results") }}
  Footer
</template>

<script>
import { BIcon, BIconTrashFill } from 'bootstrap-vue';
import CoolLightBox from 'vue-cool-lightbox';
import 'vue-cool-lightbox/dist/vue-cool-lightbox.min.css';
import InfiniteLoading from 'vue-infinite-loading';
import { SwipeList, SwipeOut } from 'vue-swipe-actions';
import 'vue-swipe-actions/dist/vue-swipe-actions.css';

import { getNotifications, removeNotification, removeNotifications } from '@/api/notifications.api';
import BackToTop from '@/components/back-to-top.vue';
import BreadcrumbFilter from '@/components/breadcrumb-filter.vue';
import Footer from '@/components/footer.vue';
import Navbar from '@/components/navbar.vue';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'Notifications',
  components: {
    BackToTop,
    BIcon,
    BIconTrashFill,
    BreadcrumbFilter,
    CoolLightBox,
    Footer,
    InfiniteLoading,
    Navbar,
    SwipeList,
    SwipeOut,
  },
  data() {
    return {
      infiniteId: Date.now(),
      index: null,
      images: [],
      loading: true,
      page: 1,
      query: '',
      notifications: [],
    };
  },
  sockets: {
    notification(notification) {
      this.notifications.unshift(notification);
      if (notification.recordStoring) {
        this.images.unshift({
          title: `${notification.camera} - ${notification.time}`,
          src: `/files/${notification.fileName}`,
          thumb:
            notification.recordType === 'Video'
              ? `/files/${notification.name}@2.jpeg`
              : `/files/${notification.fileName}`,
        });
      }
    },
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },
  },
  async mounted() {
    this.loading = false;

    document.addEventListener('mousedown', this.close);
    document.addEventListener('touchstart', this.close);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.close);
    document.removeEventListener('touchstart', this.close);
  },
  methods: {
    close(event) {
      if (
        !this.swipe &&
        !(event.target.tagName === 'path' || event.target.tagName === 'svg' || event.target.tagName === 'g') &&
        this.$refs.list
      ) {
        if (Array.isArray(this.$refs.list)) {
          for (const list of this.$refs.list) list.closeActions();
        } else {
          this.$refs.list.closeActions();
        }
      }
    },
    closed(event) {
      const removeButton = document.querySelector('div[data-remove-id="' + event.item.id + '"]');
      if (removeButton) {
        removeButton.classList.remove('showRemoveButton');
      }
    },
    filterNotifications(filter) {
      if (filter) {
        this.loading = true;
        this.notifications = [];
        this.page = 1;
        this.query = '';

        if (filter.cameras && filter.cameras.length > 0) {
          this.query += `&cameras=${filter.cameras.toString()}`;
        }

        if (filter.labels && filter.labels.length > 0) {
          this.query += `&labels=${filter.labels.toString()}`;
        }

        if (filter.rooms && filter.rooms.length > 0) {
          this.query += `&rooms=${filter.rooms.toString()}`;
        }

        if (filter.types && filter.types.length > 0) {
          this.query += `&types=${filter.types.toString()}`;
        }

        if (filter.dateRange && filter.dateRange.start) {
          this.query += `&from=${filter.dateRange.start}`;
        }

        if (filter.dateRange && filter.dateRange.end) {
          this.query += `&to=${filter.dateRange.end}`;
        }
      }

      this.infiniteId = Date.now();
      this.loading = false;
    },
    handleErrorImg(event) {
      const themeColor = localStorage.getItem('theme-color') || 'pink';
      event.target.src = require(`@/assets/img/logo_transparent-256@${themeColor}.png`);
    },
    async infiniteHandler($state) {
      try {
        if (this.checkLevel('notifications:access')) {
          const response = await getNotifications(`?page=${this.page || 1}` + this.query);

          if (response.data.result.length > 0) {
            this.page += 1;
            this.notifications = [...this.notifications, ...response.data.result];
            this.images = this.notifications
              .map((not) => {
                if (not.recordStoring) {
                  return {
                    title: `${not.camera} - ${not.time}`,
                    src: `/files/${not.fileName}`,
                    thumb: not.recordType === 'Video' ? `/files/${not.name}@2.jpeg` : `/files/${not.fileName}`,
                  };
                }
              })
              .filter((not) => not);
            $state.loaded();
          } else {
            $state.complete();
          }
        } else {
          this.$toast.error(this.$t('no_access'));
          $state.complete();
        }
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    async remove(notification, index) {
      try {
        await removeNotification(notification.id);

        const card = document.querySelector('div[data-id="' + notification.id + '"]');

        card.dataset.aos = 'fade-right';
        card.dataset.aosDuration = '500';
        card.classList.remove('aos-init');
        card.classList.remove('aos-animate');

        const removeButton = document.querySelector('div[data-remove-id="' + notification.id + '"]');

        if (removeButton) {
          removeButton.classList.add('hideRemoveButton');
        }

        await timeout(500);

        this.$store.dispatch('notifications/decrease');

        let imgsIndex;

        for (const [index_, img] of this.images.entries()) {
          if (img.src.includes(notification.fileName)) {
            imgsIndex = index_;
          }
        }

        if (imgsIndex) {
          this.$delete(this.images, imgsIndex);
        }

        this.$delete(this.notifications, index);

        if (this.notifications.length === 0) {
          this.infiniteId += 1;
        }

        this.$toast.success(`${this.$t('notification')} ${this.$t('removed')}!`);
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    async removeAll() {
      try {
        await removeNotifications();

        const cards = document.querySelectorAll('.aos-animate');

        for (const card of cards) {
          card.dataset.aos = 'fade-up';
          card.dataset.aosDuration = '500';
          card.classList.remove('aos-init');
          card.classList.remove('aos-animate');
        }

        await timeout(500);

        this.$store.dispatch('notifications/removeAll');

        this.$toast.success(this.$t('all_notifications_removed'));
        this.notifications = [];
        this.images = [];
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    rightRevealed(event) {
      this.swipe = false;
      const removeButton = document.querySelector('div[data-remove-id="' + event.item.id + '"]');
      if (removeButton) {
        removeButton.classList.add('showRemoveButton');
      }
    },
    startSwipe() {
      this.swipe = true;
    },
  },
};
</script>

<style scoped>
.inner-container {
  margin-top: 140px;
  overflow: hidden;
}

.notification-fade-enter-active {
  transition: all 0.4s ease;
}
.notification-fade-leave-active {
  transition: all 0.4s cubic-bezier(1, 0.5, 0.8, 1);
}
.notification-fade-enter,
.notification-fade-leave-to {
  transform: translateY(-30px);
  opacity: 0;
}

.card {
  font-family: Open Sans, sans-serif;
  min-width: 0;
  word-wrap: break-word;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.375rem;
  background-color: var(--secondary-bg-color);
  background-clip: border-box;
  border: 0;
  box-shadow: 0 0 1rem 0 rgb(136 152 170 / 10%);
  margin-bottom: 20px;
  padding: 1rem;
  flex-direction: unset;
}

.card-img,
.card-img-right {
  border-radius: 20px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--primary-color);
}

.card-text {
  font-size: 0.9rem;
  font-weight: 300;
  line-height: 1.7;
  color: #7d7d7d;
}

.swipe-remove {
  height: calc(100% - 20px);
  width: 50px;
  opacity: 0;
  transition: 0.3s all;
}

.showRemoveButton {
  opacity: 1;
}

.hideRemoveButton {
  opacity: 0 !important;
}
</style>

<style>
.swipeout,
.overflow-show {
  overflow: unset !important;
}
</style>

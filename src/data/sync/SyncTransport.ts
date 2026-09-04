import type {
  CamisaMeasurement,
  ChalecoMeasurement,
  Client,
  PantalonMeasurement,
  SacoMeasurement,
} from "../../features/clients/domain/types";
import type { PricingService } from "../../features/pricing/domain/pricingService";
import type { ScheduleEvent } from "../../features/schedule/domain/events";
import type { Schedule } from "../../features/schedule/domain/types";
import type { TallaTemplate } from "../../features/tallas/domain/types";
import type {
  SyncDeleteLogEntry,
  SyncTransportAttemptResult,
  SyncQueueItem,
  SyncClientQueueItem,
  SyncCamisaQueueItem,
  SyncPantalonQueueItem,
  SyncPricingServiceQueueItem,
  SyncSacoQueueItem,
  SyncChalecoQueueItem,
  SyncTallaTemplateQueueItem,
  SyncScheduleQueueItem,
  SyncScheduleEventQueueItem,
  SyncDeleteQueueItem,
} from "./types";

export interface SyncTransport {
  syncClient(client: Client): Promise<SyncTransportAttemptResult>;
  syncCamisaMeasurement(
    measurement: CamisaMeasurement,
  ): Promise<SyncTransportAttemptResult>;
  syncPantalonMeasurement(
    measurement: PantalonMeasurement,
  ): Promise<SyncTransportAttemptResult>;
  syncPricingService(
    service: PricingService,
  ): Promise<SyncTransportAttemptResult>;
  syncSacoMeasurement(
    measurement: SacoMeasurement,
  ): Promise<SyncTransportAttemptResult>;
  syncChalecoMeasurement(
    measurement: ChalecoMeasurement,
  ): Promise<SyncTransportAttemptResult>;
  syncTallaTemplate(
    template: TallaTemplate,
  ): Promise<SyncTransportAttemptResult>;
  syncSchedule(schedule: Schedule): Promise<SyncTransportAttemptResult>;
  syncScheduleEvent(
    event: ScheduleEvent,
  ): Promise<SyncTransportAttemptResult>;
  syncDeleteLogEntry(
    entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult>;
  syncAll(items: SyncQueueItem[]): Promise<void>;
}

export class NoopSyncTransport implements SyncTransport {
  async syncClient(_client: Client): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncCamisaMeasurement(
    _measurement: CamisaMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncPantalonMeasurement(
    _measurement: PantalonMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncPricingService(
    _service: PricingService,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncSacoMeasurement(
    _measurement: SacoMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncChalecoMeasurement(
    _measurement: ChalecoMeasurement,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncTallaTemplate(
    _template: TallaTemplate,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncSchedule(
    _schedule: Schedule,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncScheduleEvent(
    _event: ScheduleEvent,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncDeleteLogEntry(
    _entry: SyncDeleteLogEntry,
  ): Promise<SyncTransportAttemptResult> {
    return Promise.resolve({ outcome: "deferred_local_only" });
  }

  async syncAll(items: SyncQueueItem[]): Promise<void> {
    await Promise.all(
      items.map(async (item) => {
        try {
          switch (item.entityType) {
            case "client":
              await this.syncClient((item as SyncClientQueueItem).payload);
              break;
            case "camisa_measurement":
              await this.syncCamisaMeasurement(
                (item as SyncCamisaQueueItem).payload,
              );
              break;
            case "pantalon_measurement":
              await this.syncPantalonMeasurement(
                (item as SyncPantalonQueueItem).payload,
              );
              break;
            case "pricing_service":
              await this.syncPricingService(
                (item as SyncPricingServiceQueueItem).payload,
              );
              break;
            case "saco_measurement":
              await this.syncSacoMeasurement(
                (item as SyncSacoQueueItem).payload,
              );
              break;
            case "chaleco_measurement":
              await this.syncChalecoMeasurement(
                (item as SyncChalecoQueueItem).payload,
              );
              break;
            case "talla_template":
              await this.syncTallaTemplate(
                (item as SyncTallaTemplateQueueItem).payload,
              );
              break;
            case "schedule":
              await this.syncSchedule(
                (item as SyncScheduleQueueItem).payload,
              );
              break;
            case "schedule_event":
              await this.syncScheduleEvent(
                (item as SyncScheduleEventQueueItem).payload,
              );
              break;
            case "delete_log":
              await this.syncDeleteLogEntry(
                (item as SyncDeleteQueueItem).payload,
              );
              break;
          }
        } catch (error) {
          console.error("Error syncing item", item, error);
        }
      }),
    );
  }
}

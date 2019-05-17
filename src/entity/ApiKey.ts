import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";

@Entity("ApiKeys")
export class ApiKey extends BaseEntity {
	@ObjectIdColumn()
	id: ObjectID;

	@Column("text", { primary: true })
	apiKey: string;

	@Column("text")
	clientId: string;
}
